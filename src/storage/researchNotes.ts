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

export type ResearchPersisted = {
  notes?: string;
  links?: ResearchLinkPersisted[];
  comps?: ResearchCompPersisted[];
  docs?: ResearchDocPersisted[];
  taxIssues?: TaxIssuePersisted[];
};

const MAX_NOTES = 20_000;
const MAX_ITEMS = 50;
const MAX_TEXT = 200;
const MAX_URL = 2_000;
const MAX_NOTE = 2_000;

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

const TAX_TOPIC_SET = new Set<TaxIssueTopic>(TAX_ISSUE_TOPICS);

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

  if (
    !notes &&
    links.length === 0 &&
    comps.length === 0 &&
    docs.length === 0 &&
    taxIssues.length === 0
  ) {
    return undefined;
  }
  return {
    ...(notes ? { notes } : {}),
    ...(links.length ? { links } : {}),
    ...(comps.length ? { comps } : {}),
    ...(docs.length ? { docs } : {}),
    ...(taxIssues.length ? { taxIssues } : {}),
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
