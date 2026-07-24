import { describe, expect, it } from "vitest";
import { buildDefaultLayouts, type WidgetDef } from "../widgets/widgetLayout";
import {
  RESEARCH_BOARD_LAYOUT_REVISION,
  RESEARCH_BOARD_PRESET,
  RESEARCH_LG_MAX_ROWS,
  RESEARCH_WIDGET_DEFAULT_LAYOUTS,
  RESEARCH_WIDGET_ORDER,
  researchLgBoardBottom,
  researchWidgetLayouts,
  researchWidgetLgLayout,
  type ResearchWidgetId,
} from "./researchTabLayout";

function asDefs(): WidgetDef[] {
  return RESEARCH_WIDGET_ORDER.map((id) => ({
    id,
    title: id,
    defaultLayout: researchWidgetLgLayout(id),
    defaultLayouts: researchWidgetLayouts(id),
  }));
}

describe("researchTabLayout", () => {
  it("lists tax workbench, right-rail stack, then comps", () => {
    expect(RESEARCH_WIDGET_ORDER).toEqual(["tax-issues", "notes", "links", "docs", "comps"]);
  });

  it("exposes board revision and compact preset", () => {
    expect(RESEARCH_BOARD_LAYOUT_REVISION).toBe(2);
    expect(RESEARCH_BOARD_PRESET).toBe("compact-side-by-side");
  });

  it("defines explicit lg/md/sm for every research widget", () => {
    for (const id of RESEARCH_WIDGET_ORDER) {
      const layouts = RESEARCH_WIDGET_DEFAULT_LAYOUTS[id];
      expect(layouts.lg, id).toBeTruthy();
      expect(layouts.md, id).toBeTruthy();
      expect(layouts.sm, id).toBeTruthy();
      expect(researchWidgetLgLayout(id)).toEqual(layouts.lg);
    }
  });

  it("keeps wide default total height within the page-scroll budget", () => {
    const bottom = researchLgBoardBottom();
    expect(bottom).toBeLessThanOrEqual(RESEARCH_LG_MAX_ROWS);
    expect(bottom).toBe(28);
  });

  it("packs tax w8 beside notes/links/docs stack and comps full width on lg", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const lg = layouts.lg ?? [];
    const byId = Object.fromEntries(lg.map((item) => [item.i, item])) as Record<
      ResearchWidgetId,
      (typeof lg)[number]
    >;

    expect(byId["tax-issues"]).toMatchObject({ x: 0, y: 0, w: 8, h: 20 });
    expect(byId.notes).toMatchObject({ x: 8, y: 0, w: 4, h: 7 });
    expect(byId.links).toMatchObject({ x: 8, y: 7, w: 4, h: 7 });
    expect(byId.docs).toMatchObject({ x: 8, y: 14, w: 4, h: 6 });
    expect(byId.comps).toMatchObject({ x: 0, y: 20, w: 12, h: 8 });

    expect(byId["tax-issues"].w + byId.notes.w).toBe(12);
    expect(byId.notes.y + byId.notes.h).toBe(byId.links.y);
    expect(byId.links.y + byId.links.h).toBe(byId.docs.y);
    expect(byId.docs.y + byId.docs.h).toBe(byId["tax-issues"].y + byId["tax-issues"].h);
    expect(byId["tax-issues"].y + byId["tax-issues"].h).toBe(byId.comps.y);
  });

  it("uses md packing within 10 columns with tax beside the stack", () => {
    const layouts = buildDefaultLayouts(asDefs());
    for (const item of layouts.md ?? []) {
      expect(item.x + item.w).toBeLessThanOrEqual(10);
      expect(item.w).toBeLessThanOrEqual(10);
    }
    const byId = Object.fromEntries((layouts.md ?? []).map((item) => [item.i, item])) as Record<
      ResearchWidgetId,
      NonNullable<ReturnType<typeof buildDefaultLayouts>["md"]>[number]
    >;

    expect(byId["tax-issues"]).toMatchObject({ x: 0, w: 6, h: 20 });
    expect(byId.notes).toMatchObject({ x: 6, w: 4, h: 7 });
    expect(byId.links).toMatchObject({ x: 6, y: 7, w: 4, h: 7 });
    expect(byId.docs).toMatchObject({ x: 6, y: 14, w: 4, h: 6 });
    expect(byId.comps).toMatchObject({ w: 10, h: 8 });
    expect(byId["tax-issues"].w + byId.notes.w).toBe(10);
  });

  it("stacks sm widgets full-width in research DOM order", () => {
    const layouts = buildDefaultLayouts(asDefs());
    const sm = layouts.sm ?? [];
    expect(sm.map((item) => item.i)).toEqual([...RESEARCH_WIDGET_ORDER]);
    expect(sm.map((item) => item.y)).toEqual([0, 22, 30, 40, 50]);
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
