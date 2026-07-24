/** Pure helpers for Exit yearly / amortization table paging and term-column selection. */

export type ProjectionTermMode = "compare" | "30" | "15" | "user";

export type ProjectionTermColumn = {
  id: "30" | "15" | "user";
  label: string;
};

export type ProjectionPage<T> = {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  startYear: number;
  endYear: number;
  rows: T[];
};

export const DEFAULT_PROJECTION_PAGE_SIZE = 10;

export function projectionPageCount(rowCount: number, pageSize: number): number {
  const size = Math.max(1, Math.round(pageSize) || 1);
  const n = Math.max(0, Math.round(rowCount) || 0);
  if (n <= 0) return 1;
  return Math.max(1, Math.ceil(n / size));
}

export function clampProjectionPageIndex(pageIndex: number, pageCount: number): number {
  const count = Math.max(1, Math.round(pageCount) || 1);
  if (!Number.isFinite(pageIndex)) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(pageIndex)));
}

/** Slice year-ordered rows into a page (no scrolling through all 30 years at once). */
export function paginateProjectionRows<T extends { year: number }>(
  rows: readonly T[],
  pageIndex: number,
  pageSize: number = DEFAULT_PROJECTION_PAGE_SIZE
): ProjectionPage<T> {
  const size = Math.max(1, Math.round(pageSize) || DEFAULT_PROJECTION_PAGE_SIZE);
  const pageCount = projectionPageCount(rows.length, size);
  const index = clampProjectionPageIndex(pageIndex, pageCount);
  const start = index * size;
  const slice = rows.slice(start, start + size);
  const startYear = slice[0]?.year ?? 0;
  const endYear = slice[slice.length - 1]?.year ?? startYear;
  return {
    pageIndex: index,
    pageCount,
    pageSize: size,
    startYear,
    endYear,
    rows: slice,
  };
}

/**
 * Which term path columns to show.
 * `compare` keeps 30 + 15 (+ user term when distinct); single modes show one path.
 */
export function projectionTermColumns(
  mode: ProjectionTermMode,
  userTermYears: number,
  showUserTermColumn: boolean
): ProjectionTermColumn[] {
  const userLabel = `${userTermYears}-yr`;
  if (mode === "30") return [{ id: "30", label: "30-yr" }];
  if (mode === "15") return [{ id: "15", label: "15-yr" }];
  if (mode === "user") return [{ id: "user", label: userLabel }];

  const cols: ProjectionTermColumn[] = [
    { id: "30", label: "30-yr" },
    { id: "15", label: "15-yr" },
  ];
  if (showUserTermColumn) cols.push({ id: "user", label: userLabel });
  return cols;
}

export function normalizeProjectionTermMode(
  mode: string | null | undefined,
  showUserTermColumn: boolean
): ProjectionTermMode {
  if (mode === "30" || mode === "15" || mode === "compare") return mode;
  if (mode === "user" && showUserTermColumn) return "user";
  return "compare";
}

/**
 * Initial page index so the highlighted Mortgage-term year is visible when present
 * in the year list (or within the contiguous year span). Returns 0 when not meaningful.
 */
export function initialProjectionPageIndex(
  rows: readonly { year: number }[],
  highlightYear: number,
  pageSize: number = DEFAULT_PROJECTION_PAGE_SIZE
): number {
  const size = Math.max(1, Math.round(pageSize) || DEFAULT_PROJECTION_PAGE_SIZE);
  const pageCount = projectionPageCount(rows.length, size);
  if (!rows.length || !Number.isFinite(highlightYear) || highlightYear < 1) return 0;

  const idx = rows.findIndex((r) => r.year === highlightYear);
  if (idx >= 0) return clampProjectionPageIndex(Math.floor(idx / size), pageCount);

  const first = rows[0]?.year;
  const last = rows[rows.length - 1]?.year;
  if (first == null || last == null || highlightYear < first || highlightYear > last) return 0;

  // Contiguous year rows (1…N): map year → page without requiring an exact row match.
  return clampProjectionPageIndex(Math.floor((highlightYear - first) / size), pageCount);
}

/** Empty-state copy when there are no projection years. */
export function projectionEmptyMessage(rowCount: number): string | null {
  if (rowCount <= 0) return "No projection years to display.";
  return null;
}
