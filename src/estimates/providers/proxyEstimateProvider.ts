import type {
  EstimateRequestContext,
  ExternalEstimateBundle,
  ExternalEstimateProvider,
  ExternalEstimateSuggestion,
} from "../types";

export type ServerEstimateBundleResponse = {
  providerId: string;
  fetchedAt: string;
  offline: boolean;
  suggestions: ExternalEstimateSuggestion[];
  cached?: boolean;
};

function normalizeBaseUrl(raw: string | undefined): string | null {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

export function getEstimateApiBaseUrl(): string | null {
  return normalizeBaseUrl(import.meta.env.VITE_ESTIMATE_API_BASE_URL);
}

export function isEstimateProxyConfigured(): boolean {
  return getEstimateApiBaseUrl() !== null;
}

export const proxyEstimateProvider: ExternalEstimateProvider = {
  id: "server-proxy",
  label: "Server estimates",
  isOfflineCapable: false,
  async fetchEstimates(context: EstimateRequestContext): Promise<ExternalEstimateBundle> {
    const baseUrl = getEstimateApiBaseUrl();
    if (!baseUrl) {
      throw new Error("Estimate proxy URL is not configured.");
    }

    const controller = new AbortController();
    const timeoutMs = Number.parseInt(String(import.meta.env.VITE_ESTIMATE_API_TIMEOUT_MS ?? "12000"), 10);
    const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 12000);

    try {
      const res = await fetch(`${baseUrl}/estimatesBundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Estimate proxy failed (${res.status}).`);
      }
      const payload = (await res.json()) as ServerEstimateBundleResponse;
      return {
        providerId: payload.providerId || "server-proxy",
        fetchedAt: payload.fetchedAt || new Date().toISOString(),
        offline: Boolean(payload.offline),
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
