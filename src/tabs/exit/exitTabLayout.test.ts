import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../../widgets/widgetLayout";
import {
  EXIT_BOARD_LAYOUT_REVISION,
  EXIT_BOARD_PRESET,
  EXIT_LG_MAX_ROWS,
  EXIT_WIDGET_DEFAULT_LAYOUTS,
  EXIT_WIDGET_ORDER,
  exitLgBoardBottom,
  exitWidgetLayouts,
  exitWidgetLgLayout,
  type ExitWidgetId,
} from "./exitTabLayout";

function asDefs(): WidgetDef[] {
  return EXIT_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: exitWidgetLgLayout(id),
    defaultLayouts: exitWidgetLayouts(id),
  }));
}

describe("exitTabLayout", () => {
  it("lists overview, sale/yield, milestones+tax, projection tables, rent-vs-buy", () => {
    expect(EXIT_WIDGET_ORDER).toEqual([
      "overview",
      "sale-assumptions",
      "rental-yield",
      "milestones",
      "tax",
      "yearly-projection",
      "amortization",
      "rent-vs-buy",
    ]);
    expect(EXIT_WIDGET_ORDER).not.toContain("workspace-inputs");
    expect(EXIT_WIDGET_ORDER).not.toContain("total-gain");
  });

  it("bumps board revision so old layouts offer recommended update", () => {
    expect(EXIT_BOARD_LAYOUT_REVISION).toBeGreaterThanOrEqual(2);
    expect(EXIT_BOARD_LAYOUT_REVISION).toBe(2);
    expect(EXIT_BOARD_PRESET).toBe("compact-side-by-side");
  });

  it("defines explicit lg/md/sm for every exit widget", () => {
    for (const id of EXIT_WIDGET_ORDER) {
      const layouts = EXIT_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(exitWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("keeps wide default total height within the page-scroll budget", () => {
    const bottom = exitLgBoardBottom();
    expect(bottom).toBeLessThanOrEqual(EXIT_LG_MAX_ROWS);
    expect(bottom).toBeLessThanOrEqual(70);
    expect(bottom).toBeLessThan(102);
    expect(bottom).toBe(63);
  });

  it("gives overview room for Edit CTAs and taller sale/milestones geometry", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      ExitWidgetId,
      (typeof lg)[number]
    >;

    expect(byId.overview.h).toBeGreaterThanOrEqual(8);
    expect(byId["sale-assumptions"].h).toBeGreaterThanOrEqual(13);
    expect(byId.milestones.h).toBeGreaterThanOrEqual(18);
    expect(byId.overview).toMatchObject({ x: 0, y: 0, w: 12, h: 8 });
    expect(byId["sale-assumptions"]).toMatchObject({ x: 0, y: 8, w: 6, h: 13 });
    expect(byId["rental-yield"]).toMatchObject({ x: 6, y: 8, w: 6, h: 13 });
    expect(byId.milestones).toMatchObject({ x: 0, y: 21, w: 8, h: 18 });
    expect(byId.tax).toMatchObject({ x: 8, y: 21, w: 4, h: 18 });
    expect(byId["yearly-projection"]).toMatchObject({ x: 0, y: 39, w: 7, h: 12 });
    expect(byId.amortization).toMatchObject({ x: 7, y: 39, w: 5, h: 12 });
    expect(byId["rent-vs-buy"]).toMatchObject({ x: 0, y: 51, w: 12, h: 12 });

    expect(byId["sale-assumptions"].w + byId["rental-yield"].w).toBe(12);
    expect(byId.milestones.w + byId.tax.w).toBe(12);
    expect(byId["yearly-projection"].w + byId.amortization.w).toBe(12);
    expect(byId["sale-assumptions"].y).toBe(byId["rental-yield"].y);
    expect(byId.milestones.y).toBe(byId.tax.y);
    expect(byId["yearly-projection"].y).toBe(byId.amortization.y);
    expect(byId.overview.y + byId.overview.h).toBe(byId["sale-assumptions"].y);
    expect(byId["sale-assumptions"].y + byId["sale-assumptions"].h).toBe(byId.milestones.y);
    expect(byId.milestones.y + byId.milestones.h).toBe(byId["yearly-projection"].y);
    expect(byId["yearly-projection"].y + byId["yearly-projection"].h).toBe(byId["rent-vs-buy"].y);
  });

  it("uses md packing within 10 columns", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item])) as Record<
      ExitWidgetId,
      NonNullable<ReturnType<typeof buildDefaultLayouts>["md"]>[number]
    >;

    expect(byId.overview).toMatchObject({ w: 10, h: 8 });
    expect(byId["sale-assumptions"]).toMatchObject({ x: 0, w: 5, h: 13 });
    expect(byId["rental-yield"]).toMatchObject({ x: 5, w: 5, h: 13 });
    expect(byId.milestones).toMatchObject({ x: 0, w: 6, h: 18 });
    expect(byId.tax).toMatchObject({ x: 6, w: 4, h: 18 });
    expect(byId["yearly-projection"]).toMatchObject({ x: 0, w: 6, h: 12 });
    expect(byId.amortization).toMatchObject({ x: 6, w: 4, h: 12 });
    expect(byId["rent-vs-buy"]).toMatchObject({ w: 10, h: 12 });
  });

  it("stacks sm widgets full-width in exit order", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...EXIT_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 10, 25, 41, 61, 75, 91, 103]);
    for (const item of sm) {
      expect(item).toMatchObject({ x: 0, w: 6, maxW: 6 });
    }
  });

  it("does not overlap recommended widgets at any explicit breakpoint", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const breakpoint of ["lg", "md", "sm"] as const) {
      const items = layouts[breakpoint] ?? [];
      for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
        const left = items[leftIndex]!;
        for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
          const right = items[rightIndex]!;
          const separated =
            left.x + left.w <= right.x ||
            right.x + right.w <= left.x ||
            left.y + left.h <= right.y ||
            right.y + right.h <= left.y;
          expect(separated, `${breakpoint}: ${left.i} overlaps ${right.i}`).toBe(true);
        }
      }
    }
  });
});
