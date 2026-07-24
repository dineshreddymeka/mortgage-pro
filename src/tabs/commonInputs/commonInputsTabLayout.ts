import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../../widgets/widgetLayout";

/** Bump when Common Inputs recommended coordinates change (opt-in via “Use recommended layout”). */
export const COMMON_INPUTS_BOARD_LAYOUT_REVISION = 2;

/** Preset id stored on the Common Inputs board v3 envelope. */
export const COMMON_INPUTS_BOARD_PRESET = "compact-side-by-side";

/** Wide (lg) recommended board bottom — loan/carrying + cash invested. */
export const COMMON_INPUTS_LG_MAX_ROWS = 14;

export type CommonInputsWidgetId = "loan-carrying" | "cash-invested";

/** DOM / stack order below tablet width. */
export const COMMON_INPUTS_WIDGET_ORDER: readonly CommonInputsWidgetId[] = [
  "loan-carrying",
  "cash-invested",
] as const;

type CommonInputsWidgetLayouts = Record<CommonInputsWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Common Inputs board.
 *
 * Wide (lg ≤14 rows): Loan & carrying w7 | Cash invested w5 at h12.
 *
 * Medium (md): loan/carrying 5 + cash invested 5 at h12.
 *
 * Compact MortgageInputsFields + cash panel fit short frames; WidgetFrame safety
 * scroll keeps expanded taxes / extra-principal actions reachable. sm stack heights
 * stay tall for natural mobile reading.
 */
export const COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS: CommonInputsWidgetLayouts = {
  "loan-carrying": {
    lg: { x: 0, y: 0, w: 7, h: 12, minW: 4, minH: 10 },
    md: { x: 0, y: 0, w: 5, h: 12, minW: 4, minH: 10 },
    sm: { x: 0, y: 0, w: 6, h: 24, minW: 6, maxW: 6, minH: 14 },
  },
  "cash-invested": {
    lg: { x: 7, y: 0, w: 5, h: 12, minW: 3, minH: 8 },
    md: { x: 5, y: 0, w: 5, h: 12, minW: 3, minH: 8 },
    sm: { x: 0, y: 24, w: 6, h: 14, minW: 6, maxW: 6, minH: 10 },
  },
};

/** Bottom row of the recommended lg packing (y + h of the lowest widget). */
export function commonInputsLgBoardBottom(): number {
  let bottom = 0;
  for (const id of COMMON_INPUTS_WIDGET_ORDER) {
    const lg = COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS[id].lg;
    if (!lg) continue;
    bottom = Math.max(bottom, lg.y + lg.h);
  }
  return bottom;
}

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function commonInputsWidgetLgLayout(id: CommonInputsWidgetId): WidgetLayoutPartial {
  const lg = COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for common-inputs widget ${id}`);
  return lg;
}

export function commonInputsWidgetLayouts(id: CommonInputsWidgetId): WidgetBreakpointLayouts {
  return COMMON_INPUTS_WIDGET_DEFAULT_LAYOUTS[id];
}
