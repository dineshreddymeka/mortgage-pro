import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../widgets/widgetLayout";
import {
  FINANCING_BOARD_LAYOUT_REVISION,
  FINANCING_BOARD_PRESET,
  FINANCING_WIDGET_DEFAULT_LAYOUTS,
  FINANCING_WIDGET_ORDER,
  financingWidgetLayouts,
  financingWidgetLgLayout,
  type FinancingWidgetId,
} from "./financingTabLayout";

function asDefs(): WidgetDef[] {
  return FINANCING_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: financingWidgetLgLayout(id),
    defaultLayouts: financingWidgetLayouts(id),
  }));
}

describe("financingTabLayout", () => {
  it("lists loan essentials before product, rates, affordability, and term tools", () => {
    expect(FINANCING_WIDGET_ORDER).toEqual([
      "loan",
      "loan-product",
      "external-rate-estimates",
      "affordability",
      "term-tools",
    ]);
  });

  it("exposes board revision and compact preset", () => {
    expect(FINANCING_BOARD_LAYOUT_REVISION).toBe(5);
    expect(FINANCING_BOARD_PRESET).toBe("compact-side-by-side");
  });

  it("defines explicit lg/md/sm for every financing widget", () => {
    for (const id of FINANCING_WIDGET_ORDER) {
      const layouts = FINANCING_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(financingWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("keeps Loan & payment full width and pairs product/rates and affordability/tools on lg", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      FinancingWidgetId,
      (typeof lg)[number]
    >;

    expect(byId.loan).toMatchObject({ x: 0, y: 0, w: 12, h: 12 });
    expect(byId["loan-product"]).toMatchObject({ x: 0, y: 12, w: 7, h: 20 });
    expect(byId["external-rate-estimates"]).toMatchObject({ x: 7, y: 12, w: 5, h: 20 });
    expect(byId.affordability).toMatchObject({ x: 0, y: 32, w: 5 });
    expect(byId["term-tools"]).toMatchObject({ x: 5, y: 32, w: 7 });

    expect(byId["loan-product"].w + byId["external-rate-estimates"].w).toBe(12);
    expect(byId.affordability.w + byId["term-tools"].w).toBe(12);
    expect(byId["loan-product"].y).toBe(byId["external-rate-estimates"].y);
    expect(byId.affordability.y).toBe(byId["term-tools"].y);
    expect(byId.loan.y + byId.loan.h).toBe(byId["loan-product"].y);
    expect(byId["loan-product"].y + byId["loan-product"].h).toBe(byId.affordability.y);
  });

  it("uses md product/rates 5+5 with full-width affordability and term tools", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item])) as Record<
      FinancingWidgetId,
      NonNullable<ReturnType<typeof buildDefaultLayouts>["md"]>[number]
    >;

    expect(byId.loan).toMatchObject({ w: 10, h: 12 });
    expect(byId["loan-product"]).toMatchObject({ x: 0, w: 5, h: 20 });
    expect(byId["external-rate-estimates"]).toMatchObject({ x: 5, w: 5, h: 20 });
    expect(byId.affordability).toMatchObject({ x: 0, w: 10 });
    expect(byId["term-tools"]).toMatchObject({ x: 0, w: 10 });
    expect(byId.affordability.y).toBeGreaterThanOrEqual(
      byId["loan-product"].y + byId["loan-product"].h
    );
    expect(byId["term-tools"].y).toBe(byId.affordability.y + byId.affordability.h);
  });

  it("gives rate suggestions enough height for list, alerts, and Apply", () => {
    for (const breakpoint of ["lg", "md", "sm"] as const) {
      const layouts = FINANCING_WIDGET_DEFAULT_LAYOUTS;
      expect(layouts.loan[breakpoint]?.h).toBeGreaterThanOrEqual(12);
      expect(layouts["external-rate-estimates"][breakpoint]?.h).toBeGreaterThanOrEqual(20);
      expect(layouts["external-rate-estimates"][breakpoint]?.minH).toBeGreaterThanOrEqual(12);
      expect(layouts.affordability[breakpoint]?.minH).toBeGreaterThanOrEqual(10);
      expect(layouts["term-tools"][breakpoint]?.h).toBeGreaterThanOrEqual(18);
      expect(layouts["term-tools"][breakpoint]?.minH).toBeGreaterThanOrEqual(10);
    }
  });

  it("stacks sm widgets full-width in financing order", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...FINANCING_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 14, 28, 48, 66]);
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
