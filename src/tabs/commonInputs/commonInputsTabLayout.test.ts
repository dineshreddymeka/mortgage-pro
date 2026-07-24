import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../../widgets/widgetLayout";
import {
  COMMON_INPUTS_BOARD_LAYOUT_REVISION,
  COMMON_INPUTS_BOARD_PRESET,
  COMMON_INPUTS_LG_MAX_ROWS,
  COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS,
  COMMON_INPUTS_WIDGET_ORDER,
  commonInputsLgBoardBottom,
  commonInputsWidgetLayouts,
  commonInputsWidgetLgLayout,
  type CommonInputsWidgetId,
} from "./commonInputsTabLayout";

function asDefs(): WidgetDef[] {
  return COMMON_INPUTS_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: commonInputsWidgetLgLayout(id),
    defaultLayouts: commonInputsWidgetLayouts(id),
  }));
}

describe("commonInputsTabLayout", () => {
  it("lists loan-carrying before cash-invested", () => {
    expect(COMMON_INPUTS_WIDGET_ORDER).toEqual(["loan-carrying", "cash-invested"]);
  });

  it("exposes board revision, compact preset, and lg row budget", () => {
    expect(COMMON_INPUTS_BOARD_LAYOUT_REVISION).toBe(2);
    expect(COMMON_INPUTS_BOARD_PRESET).toBe("compact-side-by-side");
    expect(COMMON_INPUTS_LG_MAX_ROWS).toBe(14);
    expect(commonInputsLgBoardBottom()).toBeLessThanOrEqual(COMMON_INPUTS_LG_MAX_ROWS);
  });

  it("defines explicit lg/md/sm for every common-inputs widget", () => {
    for (const id of COMMON_INPUTS_WIDGET_ORDER) {
      const layouts = COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(commonInputsWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("places Loan & carrying w7 beside Cash invested w5 on lg within 14 rows", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      CommonInputsWidgetId,
      (typeof lg)[number]
    >;

    expect(byId["loan-carrying"]).toMatchObject({ x: 0, y: 0, w: 7, h: 12, minH: 10 });
    expect(byId["cash-invested"]).toMatchObject({ x: 7, y: 0, w: 5, h: 12, minH: 8 });
    expect(byId["loan-carrying"].w + byId["cash-invested"].w).toBe(12);
    expect(byId["loan-carrying"].y).toBe(byId["cash-invested"].y);
    expect(
      Math.max(
        byId["loan-carrying"].y + byId["loan-carrying"].h,
        byId["cash-invested"].y + byId["cash-invested"].h
      )
    ).toBeLessThanOrEqual(14);
  });

  it("uses md loan/carrying 5+5 cash invested at compact h12", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item])) as Record<
      CommonInputsWidgetId,
      NonNullable<ReturnType<typeof buildDefaultLayouts>["md"]>[number]
    >;

    expect(byId["loan-carrying"]).toMatchObject({ x: 0, w: 5, h: 12, minH: 10 });
    expect(byId["cash-invested"]).toMatchObject({ x: 5, w: 5, h: 12, minH: 8 });
    expect(byId["loan-carrying"].w + byId["cash-invested"].w).toBe(10);
  });

  it("keeps compact lg/md min heights; taller sm mins for natural stack", () => {
    for (const breakpoint of ["lg", "md"] as const) {
      const layouts = COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS;
      expect(layouts["loan-carrying"][breakpoint]?.minH).toBeGreaterThanOrEqual(8);
      expect(layouts["loan-carrying"][breakpoint]?.minH).toBeLessThanOrEqual(10);
      expect(layouts["cash-invested"][breakpoint]?.minH).toBeGreaterThanOrEqual(8);
      expect(layouts["cash-invested"][breakpoint]?.minH).toBeLessThanOrEqual(10);
      expect(layouts["loan-carrying"][breakpoint]?.h).toBe(12);
      expect(layouts["cash-invested"][breakpoint]?.h).toBe(12);
    }
    expect(COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS["loan-carrying"].sm?.minH).toBeGreaterThanOrEqual(14);
    expect(COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS["cash-invested"].sm?.minH).toBeGreaterThanOrEqual(10);
  });

  it("stacks sm widgets full-width in common-inputs order without shrinking mobile heights", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...COMMON_INPUTS_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 24]);
    expect(sm.map((item) => item.h)).toEqual([24, 14]);
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
