import { ensureFirebaseUser } from "../collaboration/auth";
import { getEstimateApiBaseUrl } from "../estimates/providers/proxyEstimateProvider";
import { getFirebase } from "../lib/firebase";
import type { AppPersisted } from "../storage/mortgageState";
import { parseExternalTaxResearch } from "../storage/researchNotes";
import type {
  CollectHouseTaxResearchRequest,
  CollectHouseTaxResearchResponse,
  CollectHouseTaxResearchResult,
} from "./types";

export class TaxResearchClientError extends Error {
  readonly code: "not-configured" | "unauthorized" | "timeout" | "network" | "invalid-response" | "server";

  constructor(code: TaxResearchClientError["code"], message: string) {
    super(message);
    this.name = "TaxResearchClientError";
    this.code = code;
  }
}

function normalizeBaseUrl(raw: string | undefined): string | null {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

/** Prefer dedicated tax research proxy; fall back to estimate API base URL. */
export function getTaxResearchApiBaseUrl(): string | null {
  return (
    normalizeBaseUrl(import.meta.env.VITE_TAX_RESEARCH_API_BASE_URL) ?? getEstimateApiBaseUrl()
  );
}

export function isTaxResearchApiConfigured(): boolean {
  return getTaxResearchApiBaseUrl() !== null;
}

export function getTaxResearchTimeoutMs(): number {
  const raw =
    import.meta.env.VITE_TAX_RESEARCH_API_TIMEOUT_MS ??
    import.meta.env.VITE_ESTIMATE_API_TIMEOUT_MS ??
    "35000";
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 35_000;
}

export function buildCollectHouseTaxResearchRequest(
  state: AppPersisted,
  propertyDocId: string,
  options: { forceRefresh?: boolean; persist?: boolean } = {}
): CollectHouseTaxResearchRequest {
  const docId = propertyDocId.trim();
  if (!docId) {
    throw new TaxResearchClientError("not-configured", "Select a saved house before collecting tax references.");
  }

  return {
    propertyDocId: docId,
    ...(state.propertyAddress?.trim() ? { propertyAddress: state.propertyAddress.trim() } : {}),
    ...(state.propertyPlaceId?.trim() ? { propertyPlaceId: state.propertyPlaceId.trim() } : {}),
    ...(state.propertyPostalCode?.trim() ? { propertyPostalCode: state.propertyPostalCode.trim() } : {}),
    ...(state.propertyState?.trim() ? { propertyState: state.propertyState.trim() } : {}),
    ...(state.propertyLatitude != null ? { propertyLatitude: state.propertyLatitude } : {}),
    ...(state.propertyLongitude != null ? { propertyLongitude: state.propertyLongitude } : {}),
    persist: options.persist !== false,
    ...(options.forceRefresh ? { forceRefresh: true } : {}),
  };
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string> {
  if (!getFirebase()) {
    throw new TaxResearchClientError(
      "not-configured",
      "Cloud sign-in is not configured. Set Firebase env vars to collect live tax references."
    );
  }
  const user = await ensureFirebaseUser();
  if (!user) {
    throw new TaxResearchClientError(
      "unauthorized",
      "Sign in is required to collect tax references from official sources."
    );
  }
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    throw new TaxResearchClientError("unauthorized", "Could not refresh your sign-in session.");
  }
}

function parseCollectHouseTaxResearchResponse(raw: unknown): CollectHouseTaxResearchResult {
  if (!raw || typeof raw !== "object") {
    throw new TaxResearchClientError("invalid-response", "Tax research response was not JSON.");
  }
  const payload = raw as CollectHouseTaxResearchResponse;
  if (payload.ok !== true) {
    const message =
      payload.ok === false && typeof payload.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : "Tax research collection failed.";
    throw new TaxResearchClientError("server", message);
  }

  const snapshot = parseExternalTaxResearch(payload.snapshot);
  if (!snapshot) {
    throw new TaxResearchClientError(
      "invalid-response",
      "Tax research response did not include a valid snapshot."
    );
  }

  return {
    snapshot,
    persisted: Boolean(payload.persisted),
    cacheHit: Boolean(payload.cacheHit),
    accessRole: payload.accessRole === "member" ? "member" : "owner",
  };
}

export type CollectHouseTaxResearchOptions = {
  state: AppPersisted;
  propertyDocId: string;
  forceRefresh?: boolean;
  persist?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  getToken?: (forceRefresh: boolean) => Promise<string>;
};

export async function collectHouseTaxResearch(
  options: CollectHouseTaxResearchOptions
): Promise<CollectHouseTaxResearchResult> {
  const baseUrl = getTaxResearchApiBaseUrl();
  if (!baseUrl) {
    throw new TaxResearchClientError(
      "not-configured",
      "Tax research API URL is not configured. Set VITE_TAX_RESEARCH_API_BASE_URL or VITE_ESTIMATE_API_BASE_URL."
    );
  }

  const body = buildCollectHouseTaxResearchRequest(options.state, options.propertyDocId, {
    forceRefresh: options.forceRefresh,
    persist: options.persist,
  });
  const fetchImpl = options.fetchImpl ?? fetch;
  const getToken = options.getToken ?? getFirebaseIdToken;
  const timeoutMs = options.timeoutMs ?? getTaxResearchTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = await getToken(Boolean(options.forceRefresh));
    const res = await fetchImpl(`${baseUrl}/collectHouseTaxResearch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        throw new TaxResearchClientError(
          "invalid-response",
          text.slice(0, 240) || "Tax research response was not valid JSON."
        );
      }
    }

    if (!res.ok) {
      const message =
        json &&
        typeof json === "object" &&
        (json as { error?: unknown }).error &&
        typeof (json as { error?: string }).error === "string"
          ? (json as { error: string }).error
          : text.slice(0, 240) || `Tax research request failed (${res.status}).`;
      throw new TaxResearchClientError("server", message);
    }

    return parseCollectHouseTaxResearchResponse(json);
  } catch (err) {
    if (err instanceof TaxResearchClientError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new TaxResearchClientError("timeout", "Tax research collection timed out. Try again.");
    }
    throw new TaxResearchClientError(
      "network",
      err instanceof Error ? err.message : "Could not reach the tax research service."
    );
  } finally {
    clearTimeout(timer);
  }
}
