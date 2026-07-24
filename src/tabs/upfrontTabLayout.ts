import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../widgets/widgetLayout";

/** Bump when Upfront recommended coordinates change (opt-in via “Use recommended layout”). */
export const UPFRONT_BOARD_LAYOUT_REVISION = 4;

/** Preset id stored on the Upfront board v3 envelope. */
export const UPFRONT_BOARD_PRESET = "compact-side-by-side";

export type UpfrontWidgetId = "settlement" | "credits" | "inputs-model";

/** DOM / stack order below tablet width. */
export const UPFRONT_WIDGET_ORDER: readonly UpfrontWidgetId[] = [
  "settlement",
  "credits",
  "inputs-model",
] as const;

type UpfrontWidgetLayouts = Record<UpfrontWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Upfront board.
 *
 * Wide (lg): Settlement Summary w5 | Credits & Rehab w7; Inputs & Modeled Costs full width
 * (compact Common Inputs summary + fee model).
 *
 * Medium (md): settlement/credits 5+5; inputs full width.
 *
 * Inputs & Modeled Costs keeps minH ≥14 so fee-model actions stay reachable after resize.
 */
export const UPFRONT_WIDGET_DEFAULT_LAYOUTS: UpfrontWidgetLayouts = {
  settlement: {
    lg: { x: 0, y: 0, w: 5, h: 8, minW: 4, minH: 6 },
    md: { x: 0, y: 0, w: 5, h: 8, minW: 4, minH: 6 },
    sm: { x: 0, y: 0, w: 6, h: 8, minW: 6, maxW: 6, minH: 6 },
  },
  credits: {
    lg: { x: 5, y: 0, w: 7, h: 8, minW: 4, minH: 6 },
    md: { x: 5, y: 0, w: 5, h: 8, minW: 4, minH: 6 },
    sm: { x: 0, y: 8, w: 6, h: 10, minW: 6, maxW: 6, minH: 6 },
  },
  "inputs-model": {
    lg: { x: 0, y: 8, w: 12, h: 20, minW: 6, minH: 14 },
    md: { x: 0, y: 8, w: 10, h: 20, minW: 5, minH: 14 },
    sm: { x: 0, y: 18, w: 6, h: 24, minW: 6, maxW: 6, minH: 14 },
  },
};

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function upfrontWidgetLgLayout(id: UpfrontWidgetId): WidgetLayoutPartial {
  const lg = UPFRONT_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for upfront widget ${id}`);
  return lg;
}

export function upfrontWidgetLayouts(id: UpfrontWidgetId): WidgetBreakpointLayouts {
  return UPFRONT_WIDGET_DEFAULT_LAYOUTS[id];
}
