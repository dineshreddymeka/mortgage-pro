import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../widgets/widgetLayout";
import {
  UPFRONT_BOARD_LAYOUT_REVISION,
  UPFRONT_BOARD_PRESET,
  UPFRONT_WIDGET_DEFAULT_LAYOUTS,
  UPFRONT_WIDGET_ORDER,
  upfrontWidgetLayouts,
  upfrontWidgetLgLayout,
  type UpfrontWidgetId,
} from "./upfrontTabLayout";

function asDefs(): WidgetDef[] {
  return UPFRONT_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: upfrontWidgetLgLayout(id),
    defaultLayouts: upfrontWidgetLayouts(id),
  }));
}

describe("upfrontTabLayout", () => {
  it("lists settlement before credits and inputs-model", () => {
    expect(UPFRONT_WIDGET_ORDER).toEqual(["settlement", "credits", "inputs-model"]);
  });

  it("exposes board revision and compact preset", () => {
    expect(UPFRONT_BOARD_LAYOUT_REVISION).toBe(4);
    expect(UPFRONT_BOARD_PRESET).toBe("compact-side-by-side");
  });

  it("defines explicit lg/md/sm for every upfront widget", () => {
    for (const id of UPFRONT_WIDGET_ORDER) {
      const layouts = UPFRONT_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(upfrontWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("places Settlement Summary w5 beside Credits & Rehab w7 on lg", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      UpfrontWidgetId,
      (typeof lg)[number]
    >;

    expect(byId.settlement).toMatchObject({ x: 0, y: 0, w: 5, h: 8 });
    expect(byId.credits).toMatchObject({ x: 5, y: 0, w: 7, h: 8 });
    expect(byId["inputs-model"]).toMatchObject({ x: 0, y: 8, w: 12, h: 20 });

    expect(byId.settlement.w + byId.credits.w).toBe(12);
    expect(byId.settlement.y).toBe(byId.credits.y);
    expect(byId.settlement.y + byId.settlement.h).toBe(byId["inputs-model"].y);
  });

  it("uses md settlement/credits 5+5 with full-width inputs", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item])) as Record<
      UpfrontWidgetId,
      NonNullable<ReturnType<typeof buildDefaultLayouts>["md"]>[number]
    >;

    expect(byId.settlement).toMatchObject({ x: 0, w: 5, h: 8 });
    expect(byId.credits).toMatchObject({ x: 5, w: 5, h: 8 });
    expect(byId["inputs-model"]).toMatchObject({ x: 0, w: 10, h: 20 });
    expect(byId.settlement.w + byId.credits.w).toBe(10);
    expect(byId["inputs-model"].y).toBe(byId.settlement.y + byId.settlement.h);
  });

  it("keeps compact top-row heights and inputs-model minH for actions", () => {
    for (const breakpoint of ["lg", "md"] as const) {
      const layouts = UPFRONT_WIDGET_DEFAULT_LAYOUTS;
      expect(layouts.settlement[breakpoint]?.h).toBe(8);
      expect(layouts.credits[breakpoint]?.h).toBe(8);
      expect(layouts["inputs-model"][breakpoint]?.h).toBe(20);
      expect(layouts["inputs-model"][breakpoint]?.minH).toBeGreaterThanOrEqual(14);
    }
    expect(UPFRONT_WIDGET_DEFAULT_LAYOUTS.settlement.sm?.h).toBe(8);
    expect(UPFRONT_WIDGET_DEFAULT_LAYOUTS.credits.sm?.h).toBeGreaterThanOrEqual(8);
    expect(UPFRONT_WIDGET_DEFAULT_LAYOUTS["inputs-model"].sm?.h).toBeGreaterThanOrEqual(20);
    expect(UPFRONT_WIDGET_DEFAULT_LAYOUTS["inputs-model"].sm?.minH).toBeGreaterThanOrEqual(14);
  });

  it("stacks sm widgets full-width in upfront order", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...UPFRONT_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 8, 18]);
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
