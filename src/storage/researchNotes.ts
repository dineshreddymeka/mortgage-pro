/** Diligence notes, links, comps, and doc refs — optional scenario block. */

export type ResearchLinkKind = "listing" | "comp" | "doc" | "other";

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

export type ResearchPersisted = {
  notes?: string;
  links?: ResearchLinkPersisted[];
  comps?: ResearchCompPersisted[];
  docs?: ResearchDocPersisted[];
};

const MAX_NOTES = 20_000;
const MAX_ITEMS = 50;
const MAX_TEXT = 200;
const MAX_URL = 2_000;
const MAX_NOTE = 2_000;

const LINK_KINDS = new Set<ResearchLinkKind>(["listing", "comp", "doc", "other"]);

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

  if (!notes && links.length === 0 && comps.length === 0 && docs.length === 0) return undefined;
  return {
    ...(notes ? { notes } : {}),
    ...(links.length ? { links } : {}),
    ...(comps.length ? { comps } : {}),
    ...(docs.length ? { docs } : {}),
  };
}

export function emptyResearchNotes(): ResearchPersisted {
  return { notes: "", links: [], comps: [], docs: [] };
}

export function researchOrEmpty(research: ResearchPersisted | undefined): ResearchPersisted {
  return {
    notes: research?.notes ?? "",
    links: research?.links ?? [],
    comps: research?.comps ?? [],
    docs: research?.docs ?? [],
  };
}
