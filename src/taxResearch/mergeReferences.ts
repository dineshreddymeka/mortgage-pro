import type { TaxResourceEntry } from "../lib/taxResourcePack";
import type {
  ExternalTaxResearchPersisted,
  ExternalTaxResearchReferencePersisted,
  ResearchPersisted,
  TaxIssueJurisdiction,
  TaxIssuePersisted,
} from "../storage/researchNotes";
import { newResearchId, taxIssueFromCurated } from "../storage/researchNotes";
import { canonicalUrlDedupeKey } from "./canonicalUrl";
import type { MergedTaxReferenceRow } from "./types";

/** Default TTL mirrors server `CACHE_TTL_SECONDS` (6 hours). */
export const DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_MS = 21_600_000;

const REUSABLE_COLLECTION_STATUSES = new Set<ExternalTaxResearchPersisted["collectionStatus"]>([
  "complete",
  "partial",
]);

function referenceRowKey(
  url: string | undefined,
  normalizedKey: string | undefined,
  id: string
): string {
  const urlKey = url ? canonicalUrlDedupeKey(url) : null;
  if (urlKey) return `url:${urlKey}`;
  if (normalizedKey?.trim()) return `key:${normalizedKey.trim().toLowerCase()}`;
  return `id:${id}`;
}

function inferJurisdiction(
  jurisdiction: TaxIssueJurisdiction | undefined,
  fallback: TaxIssueJurisdiction = "county"
): TaxIssueJurisdiction {
  return jurisdiction ?? fallback;
}

/** Merge curated pack entries with external normalized references using canonical URL dedupe. */
export function mergeTaxReferenceRows(
  curated: TaxResourceEntry[],
  external: ExternalTaxResearchReferencePersisted[] | undefined
): MergedTaxReferenceRow[] {
  const rows = new Map<string, MergedTaxReferenceRow>();

  for (const entry of curated) {
    const key = referenceRowKey(entry.url, undefined, entry.id);
    rows.set(key, {
      key,
      kind: "curated",
      jurisdiction: entry.jurisdiction,
      curated: {
        id: entry.id,
        topic: entry.topic,
        title: entry.title,
        url: entry.url,
        source: entry.source,
        blurb: entry.blurb,
      },
    });
  }

  for (const ref of external ?? []) {
    const key = referenceRowKey(ref.url, ref.normalizedKey, ref.id);
    const existing = rows.get(key);
    const jurisdiction = inferJurisdiction(ref.jurisdiction, existing?.jurisdiction ?? "county");
    if (existing) {
      rows.set(key, {
        ...existing,
        kind: "both",
        jurisdiction,
        external: ref,
      });
      continue;
    }
    rows.set(key, {
      key,
      kind: "external",
      jurisdiction,
      external: ref,
    });
  }

  const order: Record<MergedTaxReferenceRow["jurisdiction"], number> = {
    county: 0,
    state: 1,
    federal: 2,
  };

  return [...rows.values()].sort((a, b) => {
    const byJurisdiction = order[a.jurisdiction] - order[b.jurisdiction];
    if (byJurisdiction !== 0) return byJurisdiction;
    const aTitle = a.curated?.title ?? a.external?.title ?? "";
    const bTitle = b.curated?.title ?? b.external?.title ?? "";
    return aTitle.localeCompare(bTitle);
  });
}

/** Preserve manual research fields such as `taxIssues` while replacing `externalTaxResearch`. */
export function mergeExternalSnapshotIntoResearch(
  research: ResearchPersisted,
  snapshot: ExternalTaxResearchPersisted
): ResearchPersisted {
  return {
    ...research,
    externalTaxResearch: snapshot,
  };
}

export function isTaxResearchSnapshotFresh(
  snapshot: ExternalTaxResearchPersisted | undefined,
  ttlMs: number = DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_MS,
  nowMs: number = Date.now()
): boolean {
  if (!snapshot) return false;
  if (!REUSABLE_COLLECTION_STATUSES.has(snapshot.collectionStatus)) return false;
  const collectedAtMs = Date.parse(snapshot.collectedAt);
  if (!Number.isFinite(collectedAtMs)) return false;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return false;
  return nowMs - collectedAtMs < ttlMs;
}

export function formatTaxResearchFreshness(
  snapshot: ExternalTaxResearchPersisted | undefined,
  ttlMs: number = DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_MS,
  nowMs: number = Date.now()
): string {
  if (!snapshot?.collectedAt) return "Not collected yet";
  const collectedAtMs = Date.parse(snapshot.collectedAt);
  if (!Number.isFinite(collectedAtMs)) return "Collection time unknown";
  const ageMs = Math.max(0, nowMs - collectedAtMs);
  const fresh = isTaxResearchSnapshotFresh(snapshot, ttlMs, nowMs);
  const hours = Math.floor(ageMs / 3_600_000);
  const minutes = Math.floor((ageMs % 3_600_000) / 60_000);
  const ageLabel =
    hours > 0 ? `${hours}h ${minutes}m ago` : minutes > 0 ? `${minutes}m ago` : "just now";
  return fresh ? `Fresh · collected ${ageLabel}` : `Stale · collected ${ageLabel}`;
}

export function formatCollectionStatusLabel(
  status: ExternalTaxResearchPersisted["collectionStatus"] | undefined
): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "pending":
      return "Pending";
    case "stale":
      return "Stale";
    case "idle":
    default:
      return "Not collected";
  }
}

export function collectionStatusChipColor(
  status: ExternalTaxResearchPersisted["collectionStatus"] | undefined
): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case "complete":
      return "success";
    case "partial":
      return "warning";
    case "failed":
      return "error";
    case "running":
    case "pending":
      return "info";
    case "stale":
      return "warning";
    default:
      return "default";
  }
}

export function taxIssueFromExternal(ref: ExternalTaxResearchReferencePersisted): TaxIssuePersisted {
  return {
    id: newResearchId(),
    topic: ref.topic,
    title: ref.title,
    ...(ref.url ? { url: ref.url } : {}),
    ...(ref.source ? { source: ref.source } : {}),
    ...(ref.jurisdiction ? { jurisdiction: ref.jurisdiction } : {}),
    ...(ref.externalRefId ? { curatedRefId: ref.externalRefId } : {}),
    ...(ref.excerpt ? { notes: ref.excerpt.slice(0, 2000) } : {}),
    addedAt: new Date().toISOString(),
  };
}

export function isExternalReferenceSaved(
  taxIssues: TaxIssuePersisted[] | undefined,
  ref: ExternalTaxResearchReferencePersisted
): boolean {
  const list = taxIssues ?? [];
  const urlKey = ref.url ? canonicalUrlDedupeKey(ref.url) : null;
  return list.some((issue) => {
    if (ref.externalRefId && issue.curatedRefId === ref.externalRefId) return true;
    if (ref.id && issue.curatedRefId === ref.id) return true;
    if (urlKey && issue.url && canonicalUrlDedupeKey(issue.url) === urlKey) return true;
    return false;
  });
}

export function isMergedReferenceSaved(
  taxIssues: TaxIssuePersisted[] | undefined,
  row: MergedTaxReferenceRow
): boolean {
  if (row.curated) {
    return (taxIssues ?? []).some(
      (issue) =>
        issue.curatedRefId === row.curated!.id ||
        (issue.url === row.curated!.url && issue.title.length > 0)
    );
  }
  if (row.external) return isExternalReferenceSaved(taxIssues, row.external);
  return false;
}

export function taxIssueFromMergedRow(row: MergedTaxReferenceRow): TaxIssuePersisted {
  if (row.curated) {
    return taxIssueFromCurated({
      id: row.curated.id,
      topic: row.curated.topic,
      title: row.curated.title,
      url: row.curated.url,
      source: row.curated.source,
      blurb: row.curated.blurb,
      jurisdiction: row.jurisdiction,
    });
  }
  if (row.external) return taxIssueFromExternal(row.external);
  throw new Error("Merged reference row has no saveable content.");
}
