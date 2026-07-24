import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../widgets/widgetLayout";

/** Bump when Research recommended coordinates / widget packing change. */
export const RESEARCH_BOARD_LAYOUT_REVISION = 2;

/** Preset id stored on the Research board v3 envelope. */
export const RESEARCH_BOARD_PRESET = "compact-side-by-side";

/** Wide (lg) recommended board bottom — tax workbench + comps strip. */
export const RESEARCH_LG_MAX_ROWS = 28;

export type ResearchWidgetId = "tax-issues" | "notes" | "links" | "docs" | "comps";

/** DOM / stack order below tablet width — tax first, then right-rail stack, comps last. */
export const RESEARCH_WIDGET_ORDER: readonly ResearchWidgetId[] = [
  "tax-issues",
  "notes",
  "links",
  "docs",
  "comps",
] as const;

type ResearchWidgetLayouts = Record<ResearchWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Research board.
 *
 * Wide (lg ≤28 rows): Tax references w8 | Notes/Links/Documents stack w4; Comps full width.
 *
 * Medium (md): same packing scaled to 10 columns (tax w6 | stack w4).
 */
export const RESEARCH_WIDGET_DEFAULT_LAYOUTS: ResearchWidgetLayouts = {
  "tax-issues": {
    lg: { x: 0, y: 0, w: 8, h: 20, minW: 4, minH: 12 },
    md: { x: 0, y: 0, w: 6, h: 20, minW: 4, minH: 12 },
    sm: { x: 0, y: 0, w: 6, h: 22, minW: 6, maxW: 6, minH: 12 },
  },
  notes: {
    lg: { x: 8, y: 0, w: 4, h: 7, minW: 3, minH: 5 },
    md: { x: 6, y: 0, w: 4, h: 7, minW: 3, minH: 5 },
    sm: { x: 0, y: 22, w: 6, h: 8, minW: 6, maxW: 6, minH: 5 },
  },
  links: {
    lg: { x: 8, y: 7, w: 4, h: 7, minW: 3, minH: 5 },
    md: { x: 6, y: 7, w: 4, h: 7, minW: 3, minH: 5 },
    sm: { x: 0, y: 30, w: 6, h: 10, minW: 6, maxW: 6, minH: 5 },
  },
  docs: {
    lg: { x: 8, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
    md: { x: 6, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
    sm: { x: 0, y: 40, w: 6, h: 10, minW: 6, maxW: 6, minH: 4 },
  },
  comps: {
    lg: { x: 0, y: 20, w: 12, h: 8, minW: 6, minH: 6 },
    md: { x: 0, y: 20, w: 10, h: 8, minW: 5, minH: 6 },
    sm: { x: 0, y: 50, w: 6, h: 12, minW: 6, maxW: 6, minH: 6 },
  },
};

/** Bottom row of the recommended lg packing (y + h of the lowest widget). */
export function researchLgBoardBottom(): number {
  let bottom = 0;
  for (const id of RESEARCH_WIDGET_ORDER) {
    const lg = RESEARCH_WIDGET_DEFAULT_LAYOUTS[id].lg;
    if (!lg) continue;
    bottom = Math.max(bottom, lg.y + lg.h);
  }
  return bottom;
}

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function researchWidgetLgLayout(id: ResearchWidgetId): WidgetLayoutPartial {
  const lg = RESEARCH_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for research widget ${id}`);
  return lg;
}

export function researchWidgetLayouts(id: ResearchWidgetId): WidgetBreakpointLayouts {
  return RESEARCH_WIDGET_DEFAULT_LAYOUTS[id];
}
