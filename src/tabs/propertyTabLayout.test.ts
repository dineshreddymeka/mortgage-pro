import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../widgets/widgetLayout";
import {
  PROPERTY_BOARD_LAYOUT_REVISION,
  PROPERTY_BOARD_PRESET,
  PROPERTY_WIDGET_DEFAULT_LAYOUTS,
  PROPERTY_WIDGET_ORDER,
  propertyWidgetLayouts,
  propertyWidgetLgLayout,
  type PropertyWidgetId,
} from "./propertyTabLayout";

function asDefs(): WidgetDef[] {
  return PROPERTY_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: propertyWidgetLgLayout(id),
    defaultLayouts: propertyWidgetLayouts(id),
  }));
}

describe("propertyTabLayout", () => {
  it("lists essentials before administration", () => {
    expect(PROPERTY_WIDGET_ORDER).toEqual([
      "identity",
      "location",
      "location-costs",
      "external-estimates",
      "account",
      "scenario-import",
      "collaboration",
      "share-snapshots",
    ]);
  });

  it("exposes board revision and compact preset", () => {
    expect(PROPERTY_BOARD_LAYOUT_REVISION).toBe(3);
    expect(PROPERTY_BOARD_PRESET).toBe("compact-side-by-side");
  });

  it("defines explicit lg/md/sm for every property widget", () => {
    for (const id of PROPERTY_WIDGET_ORDER) {
      const layouts = PROPERTY_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(propertyWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("uses wide name+location and stacked admin pairs on lg", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      PropertyWidgetId,
      (typeof lg)[number]
    >;

    expect(byId.identity).toMatchObject({ x: 0, y: 0, w: 4 });
    expect(byId.location).toMatchObject({ x: 4, y: 0, w: 8 });
    expect(byId["location-costs"]).toMatchObject({ x: 0, y: 7, w: 4 });
    expect(byId["external-estimates"]).toMatchObject({ x: 0, y: 15, w: 6 });
    expect(byId.account).toMatchObject({ x: 6, y: 15, w: 6 });
    expect(byId["scenario-import"]).toMatchObject({ x: 6, y: 24, w: 6 });
    expect(byId.collaboration).toMatchObject({ x: 0, y: 32, w: 6 });
    expect(byId["share-snapshots"]).toMatchObject({ x: 6, y: 32, w: 6 });

    // Hints sit under name; location column height covers name + hints.
    expect(byId.identity.h + byId["location-costs"].h).toBe(byId.location.h);
    // Account + import remain beside estimates and end before the next row.
    expect(byId.account.y + byId.account.h).toBe(byId["scenario-import"].y);
    expect(byId["external-estimates"].y + byId["external-estimates"].h).toBeLessThanOrEqual(
      byId.collaboration.y
    );
    expect(byId["scenario-import"].y + byId["scenario-import"].h).toBeLessThanOrEqual(
      byId["share-snapshots"].y
    );
  });

  it("gives compact widgets enough height for primary actions", () => {
    for (const breakpoint of ["lg", "md", "sm"] as const) {
      const layouts = PROPERTY_WIDGET_DEFAULT_LAYOUTS;
      expect(layouts.identity[breakpoint]?.h).toBe(7);
      expect(layouts.account[breakpoint]?.h).toBe(9);
      expect(layouts["scenario-import"][breakpoint]?.h).toBe(8);
      expect(layouts["external-estimates"][breakpoint]?.h).toBe(16);
      expect(layouts.collaboration[breakpoint]?.h).toBe(16);
      expect(layouts["share-snapshots"][breakpoint]?.h).toBe(16);
    }
  });

  it("keeps md side-by-side pairs within 10 columns", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item]));
    expect(byId.identity).toMatchObject({ w: 4 });
    expect(byId.location).toMatchObject({ x: 4, w: 6 });
    expect(byId.account).toMatchObject({ x: 5, w: 5 });
    expect(byId.collaboration).toMatchObject({ x: 0, w: 5 });
    expect(byId["share-snapshots"]).toMatchObject({ x: 5, w: 5 });
  });

  it("stacks sm widgets full-width in essentials-first order", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...PROPERTY_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 7, 21, 29, 45, 54, 62, 78]);
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
