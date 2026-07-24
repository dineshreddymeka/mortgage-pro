import { describe, expect, it } from "vitest";
import {
  COMPARE_SELECTION_STORAGE_KEY,
  COMPARE_SELECTION_VERSION,
  bootstrapCompareSelection,
  filterSelectedRows,
  initialCompareSelection,
  isLegacyCompareSelectionRaw,
  parseCompareSelection,
  reconcileCompareSelection,
  serializeCompareSelection,
  toggleCompareId,
} from "./compareSelection";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("compareSelection", () => {
  it("parses versioned envelopes and legacy string arrays", () => {
    expect(parseCompareSelection(null)).toBeNull();
    expect(parseCompareSelection("")).toBeNull();
    expect(parseCompareSelection('["a","b"]')).toEqual(["a", "b"]);
    expect(parseCompareSelection("[]")).toEqual([]);
    expect(
      parseCompareSelection(JSON.stringify({ v: COMPARE_SELECTION_VERSION, ids: ["x"] }))
    ).toEqual(["x"]);
    expect(parseCompareSelection(JSON.stringify({ v: COMPARE_SELECTION_VERSION, ids: [] }))).toEqual(
      []
    );
    expect(parseCompareSelection(JSON.stringify({ v: 99, ids: ["x"] }))).toBeNull();
    expect(parseCompareSelection("{bad")).toBeNull();
  });

  it("detects legacy bare arrays", () => {
    expect(isLegacyCompareSelectionRaw('["a"]')).toBe(true);
    expect(isLegacyCompareSelectionRaw("[]")).toBe(true);
    expect(
      isLegacyCompareSelectionRaw(JSON.stringify({ v: COMPARE_SELECTION_VERSION, ids: ["a"] }))
    ).toBe(false);
    expect(isLegacyCompareSelectionRaw(null)).toBe(false);
  });

  it("serializes a versioned envelope", () => {
    expect(JSON.parse(serializeCompareSelection(["a", "b"]))).toEqual({
      v: COMPARE_SELECTION_VERSION,
      ids: ["a", "b"],
    });
    expect(JSON.parse(serializeCompareSelection([]))).toEqual({
      v: COMPARE_SELECTION_VERSION,
      ids: [],
    });
  });

  it("defaults missing storage to all candidates but keeps explicit empty", () => {
    expect(initialCompareSelection(["a", "b"], null)).toEqual(["a", "b"]);
    expect(initialCompareSelection(["a", "b"], [])).toEqual([]);
    expect(initialCompareSelection(["a", "b"], ["b", "gone"])).toEqual(["b"]);
  });

  it("falls back to all candidates when stored non-empty ids are all stale", () => {
    expect(initialCompareSelection(["a", "b"], ["gone", "also-gone"])).toEqual(["a", "b"]);
  });

  it("rewrites legacy selection to the current envelope on bootstrap", () => {
    const storage = memoryStorage({
      [COMPARE_SELECTION_STORAGE_KEY]: '["b","gone"]',
    });
    expect(bootstrapCompareSelection(["a", "b"], storage)).toEqual(["b"]);
    expect(JSON.parse(storage.getItem(COMPARE_SELECTION_STORAGE_KEY)!)).toEqual({
      v: COMPARE_SELECTION_VERSION,
      ids: ["b"],
    });
  });

  it("rewrites all-stale non-empty picks to all candidates and keeps explicit empty", () => {
    const stale = memoryStorage({
      [COMPARE_SELECTION_STORAGE_KEY]: JSON.stringify({
        v: COMPARE_SELECTION_VERSION,
        ids: ["gone"],
      }),
    });
    expect(bootstrapCompareSelection(["a", "b"], stale)).toEqual(["a", "b"]);
    expect(JSON.parse(stale.getItem(COMPARE_SELECTION_STORAGE_KEY)!)).toEqual({
      v: COMPARE_SELECTION_VERSION,
      ids: ["a", "b"],
    });

    const empty = memoryStorage({
      [COMPARE_SELECTION_STORAGE_KEY]: JSON.stringify({
        v: COMPARE_SELECTION_VERSION,
        ids: [],
      }),
    });
    expect(bootstrapCompareSelection(["a", "b"], empty)).toEqual([]);
    expect(JSON.parse(empty.getItem(COMPARE_SELECTION_STORAGE_KEY)!)).toEqual({
      v: COMPARE_SELECTION_VERSION,
      ids: [],
    });
  });

  it("keeps explicit empty across candidate changes", () => {
    expect(
      reconcileCompareSelection({
        current: [],
        candidateIds: ["a", "b", "c"],
        prevCandidateIds: ["a", "b"],
      })
    ).toEqual([]);
  });

  it("prunes removed houses and auto-includes newly added when selection is non-empty", () => {
    expect(
      reconcileCompareSelection({
        current: ["a", "gone"],
        candidateIds: ["a", "b", "c"],
        prevCandidateIds: ["a", "gone"],
      })
    ).toEqual(["a", "b", "c"]);
  });

  it("falls back to all candidates when every selected house disappears", () => {
    expect(
      reconcileCompareSelection({
        current: ["gone"],
        candidateIds: ["a", "b"],
        prevCandidateIds: ["gone"],
      })
    ).toEqual(["a", "b"]);
  });

  it("toggles ids and filters/sorts selected rows", () => {
    expect(toggleCompareId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleCompareId(["a", "b"], "a")).toEqual(["b"]);
    expect(
      filterSelectedRows(
        [
          { id: "b", houseNumber: 2 },
          { id: "a", houseNumber: 1 },
          { id: "c", houseNumber: 3 },
        ],
        ["c", "a"]
      )
    ).toEqual([
      { id: "a", houseNumber: 1 },
      { id: "c", houseNumber: 3 },
    ]);
  });
});
