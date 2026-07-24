/** Versioned Compare-tab house selection persistence (browser localStorage). */

export const COMPARE_SELECTION_STORAGE_KEY = "mortgage-pro:compare-selected-ids";
export const COMPARE_SELECTION_VERSION = 1 as const;

export type CompareSelectionEnvelope = {
  v: typeof COMPARE_SELECTION_VERSION;
  ids: string[];
};

/**
 * Parse stored selection.
 * - `null` → no preference (caller should default to all candidates)
 * - `string[]` (possibly empty) → explicit preference; empty stays empty
 */
export function parseCompareSelection(raw: string | null): string[] | null {
  if (raw == null || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string");
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as CompareSelectionEnvelope).v === COMPARE_SELECTION_VERSION &&
      Array.isArray((parsed as CompareSelectionEnvelope).ids)
    ) {
      return (parsed as CompareSelectionEnvelope).ids.filter(
        (id): id is string => typeof id === "string"
      );
    }
    return null;
  } catch {
    return null;
  }
}

/** True when storage still holds a pre-versioned bare string array. */
export function isLegacyCompareSelectionRaw(raw: string | null): boolean {
  if (raw == null || raw === "") return false;
  try {
    return Array.isArray(JSON.parse(raw));
  } catch {
    return false;
  }
}

export function serializeCompareSelection(ids: string[]): string {
  const envelope: CompareSelectionEnvelope = {
    v: COMPARE_SELECTION_VERSION,
    ids: [...ids],
  };
  return JSON.stringify(envelope);
}

export function readCompareSelection(
  storage: Pick<Storage, "getItem"> = localStorage
): string[] | null {
  try {
    return parseCompareSelection(storage.getItem(COMPARE_SELECTION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeCompareSelection(
  ids: string[],
  storage: Pick<Storage, "setItem"> = localStorage
): void {
  try {
    storage.setItem(COMPARE_SELECTION_STORAGE_KEY, serializeCompareSelection(ids));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Initial selection from storage + current candidates.
 * - Missing storage → all candidates
 * - Explicit `[]` stays empty
 * - Non-empty stored IDs that are all stale → fall back to all candidates
 */
export function initialCompareSelection(
  candidateIds: string[],
  stored: string[] | null
): string[] {
  if (stored == null) return [...candidateIds];
  if (stored.length === 0) return [];
  const allowed = new Set(candidateIds);
  const kept = stored.filter((id) => allowed.has(id));
  if (kept.length === 0) return [...candidateIds];
  return kept;
}

/**
 * Resolve selection on mount and rewrite legacy bare arrays (or all-stale
 * non-empty picks) to the current versioned envelope.
 */
export function bootstrapCompareSelection(
  candidateIds: string[],
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage
): string[] {
  let raw: string | null = null;
  try {
    raw = storage.getItem(COMPARE_SELECTION_STORAGE_KEY);
  } catch {
    raw = null;
  }

  const legacy = isLegacyCompareSelectionRaw(raw);
  const stored = parseCompareSelection(raw);
  const next = initialCompareSelection(candidateIds, stored);

  const allStaleNonEmpty =
    stored != null &&
    stored.length > 0 &&
    stored.every((id) => !candidateIds.includes(id));

  if (legacy || allStaleNonEmpty) {
    writeCompareSelection(next, storage);
  }

  return next;
}

export type ReconcileCompareSelectionArgs = {
  current: string[];
  candidateIds: string[];
  prevCandidateIds: string[];
};

/**
 * Prune removed houses; auto-include newly added candidates when the user
 * already has a non-empty selection. Explicit empty selection stays empty.
 */
export function reconcileCompareSelection({
  current,
  candidateIds,
  prevCandidateIds,
}: ReconcileCompareSelectionArgs): string[] {
  const allowed = new Set(candidateIds);
  const prev = new Set(prevCandidateIds);
  const added = candidateIds.filter((id) => !prev.has(id));

  let next = current.filter((id) => allowed.has(id));

  // Explicit empty: do not auto-fill when candidates exist / change.
  if (current.length === 0) {
    return [];
  }

  if (added.length > 0) {
    next = [...next, ...added.filter((id) => !next.includes(id))];
  }

  // Selection had ids that all disappeared — fall back to all candidates.
  if (next.length === 0 && candidateIds.length > 0 && current.length > 0) {
    return [...candidateIds];
  }

  return next;
}

export function toggleCompareId(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) return selectedIds.filter((x) => x !== id);
  return [...selectedIds, id];
}

export function filterSelectedRows<T extends { id: string; houseNumber: number }>(
  rows: T[],
  selectedIds: string[]
): T[] {
  const selected = new Set(selectedIds);
  return rows.filter((r) => selected.has(r.id)).sort((a, b) => a.houseNumber - b.houseNumber);
}
