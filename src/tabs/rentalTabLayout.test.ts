import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../widgets/widgetLayout";
import {
  RENTAL_BOARD_LAYOUT_REVISION,
  RENTAL_BOARD_PRESET,
  RENTAL_LG_MAX_ROWS,
  RENTAL_WIDGET_DEFAULT_LAYOUTS,
  RENTAL_WIDGET_ORDER,
  rentalLgBoardBottom,
  rentalWidgetLayouts,
  rentalWidgetLgLayout,
  type RentalWidgetId,
} from "./rentalTabLayout";

function asDefs(): WidgetDef[] {
  return RENTAL_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: rentalWidgetLgLayout(id),
    defaultLayouts: rentalWidgetLayouts(id),
  }));
}

describe("rentalTabLayout", () => {
  it("lists overview before income/opex, ledger stack, and analysis panels", () => {
    expect(RENTAL_WIDGET_ORDER).toEqual([
      "overview",
      "income",
      "operating-expenses",
      "pro-forma",
      "composition",
      "growth",
      "strategies",
      "tax",
      "stress",
    ]);
    expect(RENTAL_WIDGET_ORDER).not.toContain("shared-scenario");
  });

  it("exposes board revision and compact preset", () => {
    expect(RENTAL_BOARD_LAYOUT_REVISION).toBe(6);
    expect(RENTAL_BOARD_PRESET).toBe("compact-side-by-side");
  });

  it("defines explicit lg/md/sm for every rental widget", () => {
    for (const id of RENTAL_WIDGET_ORDER) {
      const layouts = RENTAL_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(rentalWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("keeps wide default total height within the page-scroll budget", () => {
    const bottom = rentalLgBoardBottom();
    expect(bottom).toBeLessThanOrEqual(RENTAL_LG_MAX_ROWS);
    expect(bottom).toBeLessThanOrEqual(60);
    expect(bottom).toBe(60);
  });

  it("packs overview, income|opex, pro-forma+stack, strategies|tax, stress on lg", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      RentalWidgetId,
      (typeof lg)[number]
    >;

    expect(byId.overview).toMatchObject({ x: 0, y: 0, w: 12, h: 10 });
    expect(byId.income).toMatchObject({ x: 0, y: 10, w: 6, h: 14 });
    expect(byId["operating-expenses"]).toMatchObject({ x: 6, y: 10, w: 6, h: 14 });
    expect(byId["pro-forma"]).toMatchObject({ x: 0, y: 24, w: 8, h: 14 });
    expect(byId.composition).toMatchObject({ x: 8, y: 24, w: 4, h: 7 });
    expect(byId.growth).toMatchObject({ x: 8, y: 31, w: 4, h: 7 });
    expect(byId.strategies).toMatchObject({ x: 0, y: 38, w: 6, h: 12 });
    expect(byId.tax).toMatchObject({ x: 6, y: 38, w: 6, h: 12 });
    expect(byId.stress).toMatchObject({ x: 0, y: 50, w: 12, h: 10 });

    expect(byId.income.w + byId["operating-expenses"].w).toBe(12);
    expect(byId["pro-forma"].w + byId.composition.w).toBe(12);
    expect(byId.strategies.w + byId.tax.w).toBe(12);
    expect(byId.income.y).toBe(byId["operating-expenses"].y);
    expect(byId.composition.y).toBe(byId["pro-forma"].y);
    expect(byId.composition.y + byId.composition.h).toBe(byId.growth.y);
    expect(byId.growth.y + byId.growth.h).toBe(byId["pro-forma"].y + byId["pro-forma"].h);
    expect(byId.strategies.y).toBe(byId.tax.y);
    expect(byId.overview.y + byId.overview.h).toBe(byId.income.y);
    expect(byId.income.y + byId.income.h).toBe(byId["pro-forma"].y);
    expect(byId["pro-forma"].y + byId["pro-forma"].h).toBe(byId.strategies.y);
    expect(byId.strategies.y + byId.strategies.h).toBe(byId.stress.y);
  });

  it("uses md packing within 10 columns with pro-forma beside composition/growth", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item])) as Record<
      RentalWidgetId,
      NonNullable<ReturnType<typeof buildDefaultLayouts>["md"]>[number]
    >;

    expect(byId.overview).toMatchObject({ w: 10, h: 10 });
    expect(byId.income).toMatchObject({ x: 0, w: 5, h: 14 });
    expect(byId["operating-expenses"]).toMatchObject({ x: 5, w: 5, h: 14 });
    expect(byId["pro-forma"]).toMatchObject({ x: 0, w: 6, h: 14 });
    expect(byId.composition).toMatchObject({ x: 6, w: 4, h: 7 });
    expect(byId.growth).toMatchObject({ x: 6, y: 31, w: 4, h: 7 });
    expect(byId.strategies).toMatchObject({ x: 0, w: 5, h: 12 });
    expect(byId.tax).toMatchObject({ x: 5, w: 5, h: 12 });
    expect(byId.stress).toMatchObject({ w: 10, h: 10 });
  });

  it("stacks sm widgets full-width in rental order", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...RENTAL_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 14, 28, 44, 62, 70, 78, 90, 102]);
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
