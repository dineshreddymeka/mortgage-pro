import { normalizeAllowedUrl } from "./allowedUrls.js";
import type {
  ExternalTaxResearchError,
  ExternalTaxResearchReference,
  ExternalTaxResearchSnapshot,
  ExternalTaxResearchSourceProvenance,
  TaxIssueJurisdiction,
  TaxIssueTopic,
} from "./types.js";

const MAX_ADDRESS_FINGERPRINT = 128;
const MAX_EXTERNAL_REFS = 50;
const MAX_EXTERNAL_ERRORS = 20;
const MAX_PROVENANCE_SOURCES = 20;
const MAX_TEXT = 200;
const MAX_NOTE = 2_000;
const MAX_PROVIDER_LABEL = 80;
const MAX_NORMALIZED_KEY = 120;
const MAX_EXTERNAL_REF_ID = 80;
const MAX_ERROR_CODE = 80;
const MAX_ERROR_MESSAGE = 500;

const TAX_TOPICS = new Set<TaxIssueTopic>([
  "property_tax",
  "rental_income",
  "depreciation",
  "qbi",
  "1031",
  "capital_gains",
  "passive_loss",
  "state_local",
  "other",
]);

const JURISDICTIONS = new Set<TaxIssueJurisdiction>(["federal", "state", "county"]);

const LINK_STATUSES = new Set(["ok", "redirected", "broken", "unknown"] as const);

function trimString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function optionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return undefined;
  return new Date(t).toISOString();
}

function sanitizeReference(raw: ExternalTaxResearchReference): ExternalTaxResearchReference | null {
  const id = trimString(raw.id, 80);
  const title = trimString(raw.title, MAX_TEXT);
  if (!id || !title) return null;

  const topic = TAX_TOPICS.has(raw.topic) ? raw.topic : "other";
  const jurisdiction = raw.jurisdiction && JURISDICTIONS.has(raw.jurisdiction) ? raw.jurisdiction : undefined;
  const url = raw.url ? normalizeAllowedUrl(raw.url) ?? undefined : undefined;
  const linkStatus =
    raw.linkStatus && LINK_STATUSES.has(raw.linkStatus) ? raw.linkStatus : url ? "unknown" : undefined;

  return {
    id,
    topic,
    title,
    ...(url ? { url } : {}),
    ...(trimString(raw.source, MAX_PROVIDER_LABEL) ? { source: trimString(raw.source, MAX_PROVIDER_LABEL) } : {}),
    ...(jurisdiction ? { jurisdiction } : {}),
    ...(trimString(raw.externalRefId, MAX_EXTERNAL_REF_ID)
      ? { externalRefId: trimString(raw.externalRefId, MAX_EXTERNAL_REF_ID) }
      : {}),
    ...(trimString(raw.normalizedKey, MAX_NORMALIZED_KEY)
      ? { normalizedKey: trimString(raw.normalizedKey, MAX_NORMALIZED_KEY) }
      : {}),
    ...(trimString(raw.excerpt, MAX_NOTE) ? { excerpt: trimString(raw.excerpt, MAX_NOTE) } : {}),
    ...(optionalIsoDate(raw.publishedAt) ? { publishedAt: optionalIsoDate(raw.publishedAt) } : {}),
    ...(optionalIsoDate(raw.retrievedAt) ? { retrievedAt: optionalIsoDate(raw.retrievedAt) } : {}),
    ...(linkStatus ? { linkStatus } : {}),
  };
}

function sanitizeError(raw: ExternalTaxResearchError): ExternalTaxResearchError | null {
  const code = trimString(raw.code, MAX_ERROR_CODE);
  const message = trimString(raw.message, MAX_ERROR_MESSAGE);
  if (!code || !message) return null;
  return {
    code,
    message,
    ...(trimString(raw.source, MAX_PROVIDER_LABEL) ? { source: trimString(raw.source, MAX_PROVIDER_LABEL) } : {}),
    ...(optionalIsoDate(raw.at) ? { at: optionalIsoDate(raw.at) } : {}),
  };
}

function sanitizeProvenance(raw: ExternalTaxResearchSourceProvenance | undefined): ExternalTaxResearchSourceProvenance | undefined {
  if (!raw) return undefined;
  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .map((item) => normalizeAllowedUrl(item))
        .filter((item): item is string => item != null)
        .slice(0, MAX_PROVENANCE_SOURCES)
    : [];

  const provider = trimString(raw.provider, MAX_PROVIDER_LABEL);
  const providerVersion = trimString(raw.providerVersion, 40);
  const bundleId = trimString(raw.bundleId, 80);
  const requestId = trimString(raw.requestId, 80);

  if (!provider && !providerVersion && !bundleId && !requestId && sources.length === 0) {
    return undefined;
  }

  return {
    ...(provider ? { provider } : {}),
    ...(providerVersion ? { providerVersion } : {}),
    ...(bundleId ? { bundleId } : {}),
    ...(requestId ? { requestId } : {}),
    ...(sources.length ? { sources } : {}),
  };
}

/** Enforce client-side bounds and strip disallowed URLs before persistence or response. */
export function boundTaxResearchSnapshot(raw: ExternalTaxResearchSnapshot): ExternalTaxResearchSnapshot {
  const addressFingerprint = trimString(raw.addressFingerprint, MAX_ADDRESS_FINGERPRINT) ?? "";
  const collectedAt = optionalIsoDate(raw.collectedAt) ?? new Date().toISOString();
  const normalizedReferences = (raw.normalizedReferences ?? [])
    .map(sanitizeReference)
    .filter((item): item is ExternalTaxResearchReference => item != null)
    .slice(0, MAX_EXTERNAL_REFS);
  const errors = (raw.errors ?? [])
    .map(sanitizeError)
    .filter((item): item is ExternalTaxResearchError => item != null)
    .slice(0, MAX_EXTERNAL_ERRORS);

  return {
    collectionStatus: raw.collectionStatus,
    addressFingerprint,
    collectedAt,
    ...(sanitizeProvenance(raw.sourceProvenance) ? { sourceProvenance: sanitizeProvenance(raw.sourceProvenance) } : {}),
    ...(normalizedReferences.length ? { normalizedReferences } : {}),
    ...(errors.length ? { errors } : {}),
  };
}
