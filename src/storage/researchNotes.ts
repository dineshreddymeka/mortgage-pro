/** Diligence notes, links, comps, doc refs, and tax issue references — optional scenario block. */

export type ResearchLinkKind = "listing" | "comp" | "doc" | "other";

export type TaxIssueTopic =
  | "property_tax"
  | "rental_income"
  | "depreciation"
  | "qbi"
  | "1031"
  | "capital_gains"
  | "passive_loss"
  | "state_local"
  | "other";

export type TaxIssueJurisdiction = "federal" | "state" | "county";

export type ResearchLinkPersisted = {
  id: string;
  url: string;
  title?: string;
  kind?: ResearchLinkKind;
  addedAt: string;
};

export type ResearchCompPersisted = {
  id: string;
  label: string;
  price?: number;
  address?: string;
  url?: string;
  notes?: string;
  addedAt: string;
};

export type ResearchDocPersisted = {
  id: string;
  title: string;
  url?: string;
  note?: string;
  addedAt: string;
};

export type TaxIssuePersisted = {
  id: string;
  topic: TaxIssueTopic;
  title: string;
  url?: string;
  notes?: string;
  source?: string;
  jurisdiction?: TaxIssueJurisdiction;
  /** Links back to a curated pack entry when saved from the library. */
  curatedRefId?: string;
  addedAt: string;
};

/** Machine-driven per-address tax reference collection lifecycle. */
export type ExternalTaxResearchCollectionStatus =
  | "idle"
  | "pending"
  | "running"
  | "complete"
  | "partial"
  | "failed"
  | "stale";

/** Provider / upstream metadata for an automated tax reference fetch. */
export type ExternalTaxResearchSourceProvenance = {
  provider?: string;
  providerVersion?: string;
  bundleId?: string;
  requestId?: string;
  /** Human-readable upstream source labels or URLs consulted. */
  sources?: string[];
};

/** Link health observed when the reference URL was fetched. */
export type ExternalTaxResearchLinkStatus = "ok" | "redirected" | "broken" | "unknown";

/** Normalized jurisdictional reference row produced by external collection. */
export type ExternalTaxResearchReferencePersisted = {
  id: string;
  topic: TaxIssueTopic;
  title: string;
  url?: string;
  source?: string;
  jurisdiction?: TaxIssueJurisdiction;
  /** Provider or curated-pack identifier when known. */
  externalRefId?: string;
  /** Stable dedupe key within a provider namespace. */
  normalizedKey?: string;
  /** Short summary or snippet from the source page. */
  excerpt?: string;
  /** When the source material was originally published, if known. */
  publishedAt?: string;
  /** When this reference was last retrieved by the collector. */
  retrievedAt?: string;
  linkStatus?: ExternalTaxResearchLinkStatus;
};

/** Bounded error row when automated collection fails or skips sources. */
export type ExternalTaxResearchErrorPersisted = {
  code: string;
  message: string;
  source?: string;
  at?: string;
};

/**
 * Per-house automated tax research snapshot — separate from user-curated `taxIssues`.
 * Omitted until an external collector writes results for the current address fingerprint.
 */
export type ExternalTaxResearchPersisted = {
  collectionStatus: ExternalTaxResearchCollectionStatus;
  /** Stable hash of normalized property identity (address, place id, postal). */
  addressFingerprint: string;
  collectedAt: string;
  sourceProvenance?: ExternalTaxResearchSourceProvenance;
  normalizedReferences?: ExternalTaxResearchReferencePersisted[];
  errors?: ExternalTaxResearchErrorPersisted[];
};

export type ResearchPersisted = {
  notes?: string;
  links?: ResearchLinkPersisted[];
  comps?: ResearchCompPersisted[];
  docs?: ResearchDocPersisted[];
  /** User-saved manual tax references — never merged with `externalTaxResearch`. */
  taxIssues?: TaxIssuePersisted[];
  externalTaxResearch?: ExternalTaxResearchPersisted;
};

const MAX_NOTES = 20_000;
const MAX_ITEMS = 50;
const MAX_TEXT = 200;
const MAX_URL = 2_000;
const MAX_NOTE = 2_000;
const MAX_ADDRESS_FINGERPRINT = 128;
const MAX_EXTERNAL_REFS = 50;
const MAX_EXTERNAL_ERRORS = 20;
const MAX_PROVENANCE_SOURCES = 20;
const MAX_ERROR_CODE = 80;
const MAX_ERROR_MESSAGE = 500;
const MAX_PROVIDER_LABEL = 80;
const MAX_NORMALIZED_KEY = 120;
const MAX_EXTERNAL_REF_ID = 80;

const LINK_KINDS = new Set<ResearchLinkKind>(["listing", "comp", "doc", "other"]);

export const TAX_ISSUE_TOPICS = [
  "property_tax",
  "rental_income",
  "depreciation",
  "qbi",
  "1031",
  "capital_gains",
  "passive_loss",
  "state_local",
  "other",
] as const satisfies readonly TaxIssueTopic[];

export const EXTERNAL_TAX_RESEARCH_STATUSES = [
  "idle",
  "pending",
  "running",
  "complete",
  "partial",
  "failed",
  "stale",
] as const satisfies readonly ExternalTaxResearchCollectionStatus[];

export const EXTERNAL_TAX_RESEARCH_LINK_STATUSES = [
  "ok",
  "redirected",
  "broken",
  "unknown",
] as const satisfies readonly ExternalTaxResearchLinkStatus[];

const TAX_TOPIC_SET = new Set<TaxIssueTopic>(TAX_ISSUE_TOPICS);
const COLLECTION_STATUS_SET = new Set<ExternalTaxResearchCollectionStatus>(
  EXTERNAL_TAX_RESEARCH_STATUSES
);
const LINK_STATUS_SET = new Set<ExternalTaxResearchLinkStatus>(EXTERNAL_TAX_RESEARCH_LINK_STATUSES);

const TAX_JURISDICTIONS = new Set<TaxIssueJurisdiction>(["federal", "state", "county"]);

export function taxIssueTopicLabel(topic: TaxIssueTopic): string {
  const labels: Record<TaxIssueTopic, string> = {
    property_tax: "Property tax",
    rental_income: "Rental income",
    depreciation: "Depreciation",
    qbi: "QBI (§199A)",
    "1031": "1031 exchange",
    capital_gains: "Capital gains",
    passive_loss: "Passive loss",
    state_local: "State / local",
    other: "Other",
  };
  return labels[topic];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asTrimmedString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function asIsoDate(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

function asOptionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return undefined;
  return new Date(t).toISOString();
}

function asNonNegNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

export function newResearchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseLink(raw: unknown): ResearchLinkPersisted | null {
  if (!isPlainObject(raw)) return null;
  const id = asTrimmedString(raw.id, 80) ?? newResearchId();
  const url = asTrimmedString(raw.url, MAX_URL);
  if (!url) return null;
  const kindRaw = asTrimmedString(raw.kind, 20);
  const kind =
    kindRaw && LINK_KINDS.has(kindRaw as ResearchLinkKind)
      ? (kindRaw as ResearchLinkKind)
      : undefined;
  return {
    id,
    url,
    ...(asTrimmedString(raw.title, MAX_TEXT) ? { title: asTrimmedString(raw.title, MAX_TEXT) } : {}),
    ...(kind ? { kind } : {}),
    addedAt: asIsoDate(raw.addedAt),
  };
}

function parseComp(raw: unknown): ResearchCompPersisted | null {
  if (!isPlainObject(raw)) return null;
  const id = asTrimmedString(raw.id, 80) ?? newResearchId();
  const label = asTrimmedString(raw.label, MAX_TEXT);
  if (!label) return null;
  const price = asNonNegNumber(raw.price);
  return {
    id,
    label,
    ...(price !== undefined ? { price } : {}),
    ...(asTrimmedString(raw.address, MAX_TEXT)
      ? { address: asTrimmedString(raw.address, MAX_TEXT) }
      : {}),
    ...(asTrimmedString(raw.url, MAX_URL) ? { url: asTrimmedString(raw.url, MAX_URL) } : {}),
    ...(asTrimmedString(raw.notes, MAX_NOTE) ? { notes: asTrimmedString(raw.notes, MAX_NOTE) } : {}),
    addedAt: asIsoDate(raw.addedAt),
  };
}

function parseDoc(raw: unknown): ResearchDocPersisted | null {
  if (!isPlainObject(raw)) return null;
  const id = asTrimmedString(raw.id, 80) ?? newResearchId();
  const title = asTrimmedString(raw.title, MAX_TEXT);
  if (!title) return null;
  return {
    id,
    title,
    ...(asTrimmedString(raw.url, MAX_URL) ? { url: asTrimmedString(raw.url, MAX_URL) } : {}),
    ...(asTrimmedString(raw.note, MAX_NOTE) ? { note: asTrimmedString(raw.note, MAX_NOTE) } : {}),
    addedAt: asIsoDate(raw.addedAt),
  };
}

function parseTaxTopic(raw: unknown): TaxIssueTopic {
  const t = asTrimmedString(raw, 30);
  if (t && TAX_TOPIC_SET.has(t as TaxIssueTopic)) return t as TaxIssueTopic;
  return "other";
}

function parseTaxJurisdiction(raw: unknown): TaxIssueJurisdiction | undefined {
  const t = asTrimmedString(raw, 20);
  if (t && TAX_JURISDICTIONS.has(t as TaxIssueJurisdiction)) return t as TaxIssueJurisdiction;
  return undefined;
}

function parseTaxIssue(raw: unknown): TaxIssuePersisted | null {
  if (!isPlainObject(raw)) return null;
  const id = asTrimmedString(raw.id, 80) ?? newResearchId();
  const title = asTrimmedString(raw.title, MAX_TEXT);
  if (!title) return null;
  const jurisdiction = parseTaxJurisdiction(raw.jurisdiction);
  const curatedRefId = asTrimmedString(raw.curatedRefId, 80);
  return {
    id,
    topic: parseTaxTopic(raw.topic),
    title,
    ...(asTrimmedString(raw.url, MAX_URL) ? { url: asTrimmedString(raw.url, MAX_URL) } : {}),
    ...(asTrimmedString(raw.notes, MAX_NOTE) ? { notes: asTrimmedString(raw.notes, MAX_NOTE) } : {}),
    ...(asTrimmedString(raw.source, 80) ? { source: asTrimmedString(raw.source, 80) } : {}),
    ...(jurisdiction ? { jurisdiction } : {}),
    ...(curatedRefId ? { curatedRefId } : {}),
    addedAt: asIsoDate(raw.addedAt),
  };
}

function parseCollectionStatus(raw: unknown): ExternalTaxResearchCollectionStatus {
  const t = asTrimmedString(raw, 30)?.toLowerCase();
  if (t && COLLECTION_STATUS_SET.has(t as ExternalTaxResearchCollectionStatus)) {
    return t as ExternalTaxResearchCollectionStatus;
  }
  return "idle";
}

function parseLinkStatus(raw: unknown): ExternalTaxResearchLinkStatus | undefined {
  const t = asTrimmedString(raw, 20)?.toLowerCase();
  if (t && LINK_STATUS_SET.has(t as ExternalTaxResearchLinkStatus)) {
    return t as ExternalTaxResearchLinkStatus;
  }
  if (raw !== undefined && raw !== null && raw !== "") return "unknown";
  return undefined;
}

function parseExternalTaxReference(raw: unknown): ExternalTaxResearchReferencePersisted | null {
  if (!isPlainObject(raw)) return null;
  const id = asTrimmedString(raw.id, 80) ?? newResearchId();
  const title = asTrimmedString(raw.title, MAX_TEXT);
  if (!title) return null;
  const jurisdiction = parseTaxJurisdiction(raw.jurisdiction);
  const externalRefId = asTrimmedString(raw.externalRefId, MAX_EXTERNAL_REF_ID);
  const normalizedKey = asTrimmedString(raw.normalizedKey, MAX_NORMALIZED_KEY);
  const excerpt = asTrimmedString(raw.excerpt, MAX_NOTE);
  const publishedAt = asOptionalIsoDate(raw.publishedAt);
  const retrievedAt = asOptionalIsoDate(raw.retrievedAt);
  const linkStatus = parseLinkStatus(raw.linkStatus);
  return {
    id,
    topic: parseTaxTopic(raw.topic),
    title,
    ...(asTrimmedString(raw.url, MAX_URL) ? { url: asTrimmedString(raw.url, MAX_URL) } : {}),
    ...(asTrimmedString(raw.source, MAX_PROVIDER_LABEL)
      ? { source: asTrimmedString(raw.source, MAX_PROVIDER_LABEL) }
      : {}),
    ...(jurisdiction ? { jurisdiction } : {}),
    ...(externalRefId ? { externalRefId } : {}),
    ...(normalizedKey ? { normalizedKey } : {}),
    ...(excerpt ? { excerpt } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(retrievedAt ? { retrievedAt } : {}),
    ...(linkStatus ? { linkStatus } : {}),
  };
}

function parseExternalTaxError(raw: unknown): ExternalTaxResearchErrorPersisted | null {
  if (!isPlainObject(raw)) return null;
  const code = asTrimmedString(raw.code, MAX_ERROR_CODE);
  const message = asTrimmedString(raw.message, MAX_ERROR_MESSAGE);
  if (!code || !message) return null;
  const source = asTrimmedString(raw.source, MAX_PROVIDER_LABEL);
  const atRaw = raw.at;
  const at =
    typeof atRaw === "string" && atRaw.trim() && Number.isFinite(Date.parse(atRaw))
      ? new Date(atRaw).toISOString()
      : undefined;
  return {
    code,
    message,
    ...(source ? { source } : {}),
    ...(at ? { at } : {}),
  };
}

function parseSourceProvenance(raw: unknown): ExternalTaxResearchSourceProvenance | undefined {
  if (!isPlainObject(raw)) return undefined;
  const provider = asTrimmedString(raw.provider, MAX_PROVIDER_LABEL);
  const providerVersion = asTrimmedString(raw.providerVersion, 40);
  const bundleId = asTrimmedString(raw.bundleId, 80);
  const requestId = asTrimmedString(raw.requestId, 80);
  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .map((item) => asTrimmedString(item, MAX_URL))
        .filter((item): item is string => item != null)
        .slice(0, MAX_PROVENANCE_SOURCES)
    : [];
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

/** Normalize optional automated tax research block; omit when empty or invalid. */
export function parseExternalTaxResearch(raw: unknown): ExternalTaxResearchPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (!isPlainObject(raw)) return undefined;

  const addressFingerprint = asTrimmedString(raw.addressFingerprint, MAX_ADDRESS_FINGERPRINT);
  const normalizedReferences = Array.isArray(raw.normalizedReferences)
    ? raw.normalizedReferences
        .map(parseExternalTaxReference)
        .filter((x): x is ExternalTaxResearchReferencePersisted => x != null)
        .slice(0, MAX_EXTERNAL_REFS)
    : [];
  const errors = Array.isArray(raw.errors)
    ? raw.errors
        .map(parseExternalTaxError)
        .filter((x): x is ExternalTaxResearchErrorPersisted => x != null)
        .slice(0, MAX_EXTERNAL_ERRORS)
    : [];
  const sourceProvenance = parseSourceProvenance(raw.sourceProvenance);
  const hasAny =
    raw.collectionStatus !== undefined ||
    raw.addressFingerprint !== undefined ||
    raw.collectedAt !== undefined ||
    raw.sourceProvenance !== undefined ||
    (Array.isArray(raw.normalizedReferences) && raw.normalizedReferences.length > 0) ||
    (Array.isArray(raw.errors) && raw.errors.length > 0);

  if (!hasAny) return undefined;
  if (!addressFingerprint) return undefined;

  const collectionStatus = parseCollectionStatus(raw.collectionStatus);
  const collectedAt = asIsoDate(raw.collectedAt);

  return {
    collectionStatus,
    addressFingerprint,
    collectedAt,
    ...(sourceProvenance ? { sourceProvenance } : {}),
    ...(normalizedReferences.length ? { normalizedReferences } : {}),
    ...(errors.length ? { errors } : {}),
  };
}

/** Normalize optional research block; omit when empty. */
export function parseResearchNotes(raw: unknown): ResearchPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (!isPlainObject(raw)) return undefined;

  const notes = asTrimmedString(raw.notes, MAX_NOTES);
  const links = Array.isArray(raw.links)
    ? raw.links.map(parseLink).filter((x): x is ResearchLinkPersisted => x != null).slice(0, MAX_ITEMS)
    : [];
  const comps = Array.isArray(raw.comps)
    ? raw.comps.map(parseComp).filter((x): x is ResearchCompPersisted => x != null).slice(0, MAX_ITEMS)
    : [];
  const docs = Array.isArray(raw.docs)
    ? raw.docs.map(parseDoc).filter((x): x is ResearchDocPersisted => x != null).slice(0, MAX_ITEMS)
    : [];
  const taxIssues = Array.isArray(raw.taxIssues)
    ? raw.taxIssues
        .map(parseTaxIssue)
        .filter((x): x is TaxIssuePersisted => x != null)
        .slice(0, MAX_ITEMS)
    : [];
  const externalTaxResearch = parseExternalTaxResearch(raw.externalTaxResearch);

  if (
    !notes &&
    links.length === 0 &&
    comps.length === 0 &&
    docs.length === 0 &&
    taxIssues.length === 0 &&
    !externalTaxResearch
  ) {
    return undefined;
  }
  return {
    ...(notes ? { notes } : {}),
    ...(links.length ? { links } : {}),
    ...(comps.length ? { comps } : {}),
    ...(docs.length ? { docs } : {}),
    ...(taxIssues.length ? { taxIssues } : {}),
    ...(externalTaxResearch ? { externalTaxResearch } : {}),
  };
}

export function emptyResearchNotes(): ResearchPersisted {
  return { notes: "", links: [], comps: [], docs: [], taxIssues: [] };
}

export function researchOrEmpty(research: ResearchPersisted | undefined): ResearchPersisted {
  return {
    notes: research?.notes ?? "",
    links: research?.links ?? [],
    comps: research?.comps ?? [],
    docs: research?.docs ?? [],
    taxIssues: research?.taxIssues ?? [],
    ...(research?.externalTaxResearch ? { externalTaxResearch: research.externalTaxResearch } : {}),
  };
}

/** Convert a curated pack entry into a persisted tax issue row. */
export function taxIssueFromCurated(entry: {
  id?: string;
  topic: TaxIssueTopic;
  title: string;
  url: string;
  source: string;
  blurb?: string;
  jurisdiction?: TaxIssueJurisdiction;
}): TaxIssuePersisted {
  return {
    id: newResearchId(),
    topic: entry.topic,
    title: entry.title,
    url: entry.url,
    source: entry.source,
    ...(entry.jurisdiction ? { jurisdiction: entry.jurisdiction } : {}),
    ...(entry.id ? { curatedRefId: entry.id } : {}),
    ...(entry.blurb ? { notes: entry.blurb.slice(0, MAX_NOTE) } : {}),
    addedAt: new Date().toISOString(),
  };
}

export function isCuratedReferenceSaved(
  taxIssues: TaxIssuePersisted[] | undefined,
  entry: { id: string; url: string }
): boolean {
  const list = taxIssues ?? [];
  return list.some((t) => t.curatedRefId === entry.id || (t.url === entry.url && t.title.length > 0));
}
