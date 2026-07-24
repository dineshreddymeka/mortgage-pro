import { describe, expect, it } from "vitest";
import {
  clampProjectionPageIndex,
  DEFAULT_PROJECTION_PAGE_SIZE,
  initialProjectionPageIndex,
  normalizeProjectionTermMode,
  paginateProjectionRows,
  projectionEmptyMessage,
  projectionPageCount,
  projectionTermColumns,
} from "./exitProjectionTable";

describe("exitProjectionTable", () => {
  const years = Array.from({ length: 30 }, (_, i) => ({ year: i + 1, value: (i + 1) * 10 }));

  it("paginates year rows without dropping later years", () => {
    expect(projectionPageCount(30, 10)).toBe(3);
    expect(projectionPageCount(0, 10)).toBe(1);
    expect(DEFAULT_PROJECTION_PAGE_SIZE).toBe(10);

    const page0 = paginateProjectionRows(years, 0, 10);
    expect(page0).toMatchObject({
      pageIndex: 0,
      pageCount: 3,
      startYear: 1,
      endYear: 10,
    });
    expect(page0.rows.map((r) => r.year)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const page2 = paginateProjectionRows(years, 2, 10);
    expect(page2.startYear).toBe(21);
    expect(page2.endYear).toBe(30);
    expect(page2.rows).toHaveLength(10);

    const clamped = paginateProjectionRows(years, 99, 10);
    expect(clamped.pageIndex).toBe(2);
    expect(clampProjectionPageIndex(-3, 3)).toBe(0);
  });

  it("selects compare vs single-term columns", () => {
    expect(projectionTermColumns("compare", 30, false).map((c) => c.id)).toEqual(["30", "15"]);
    expect(projectionTermColumns("compare", 20, true).map((c) => c.id)).toEqual(["30", "15", "user"]);
    expect(projectionTermColumns("compare", 20, true).find((c) => c.id === "user")?.label).toBe("20-yr");
    expect(projectionTermColumns("30", 20, true)).toEqual([{ id: "30", label: "30-yr" }]);
    expect(projectionTermColumns("user", 20, true)).toEqual([{ id: "user", label: "20-yr" }]);
  });

  it("normalizes term mode and rejects user mode when column hidden", () => {
    expect(normalizeProjectionTermMode("user", true)).toBe("user");
    expect(normalizeProjectionTermMode("user", false)).toBe("compare");
    expect(normalizeProjectionTermMode("nope", true)).toBe("compare");
    expect(normalizeProjectionTermMode("15", false)).toBe("15");
  });

  it("initializes page to the page containing the highlighted user-term year", () => {
    expect(initialProjectionPageIndex(years, 30, 10)).toBe(2);
    expect(initialProjectionPageIndex(years, 15, 10)).toBe(1);
    expect(initialProjectionPageIndex(years, 5, 10)).toBe(0);
    expect(initialProjectionPageIndex(years, 20, 10)).toBe(1);
    expect(paginateProjectionRows(years, initialProjectionPageIndex(years, 30, 10), 10).rows.map((r) => r.year)).toContain(
      30
    );
    expect(initialProjectionPageIndex([], 30, 10)).toBe(0);
    expect(initialProjectionPageIndex(years, 0, 10)).toBe(0);
    expect(initialProjectionPageIndex(years, 99, 10)).toBe(0);
  });

  it("returns empty pagination copy when there are no years", () => {
    expect(projectionEmptyMessage(0)).toBe("No projection years to display.");
    expect(projectionEmptyMessage(30)).toBeNull();
  });
});
