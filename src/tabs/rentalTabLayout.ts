import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../widgets/widgetLayout";

/** Bump when Rental recommended coordinates change (opt-in via “Use recommended layout”). */
export const RENTAL_BOARD_LAYOUT_REVISION = 5;

/** Preset id stored on the Rental board v3 envelope. */
export const RENTAL_BOARD_PRESET = "compact-side-by-side";

/** Wide (lg) recommended board bottom — keep page scroll in check. */
export const RENTAL_LG_MAX_ROWS = 62;

export type RentalWidgetId =
  | "overview"
  | "income"
  | "operating-expenses"
  | "pro-forma"
  | "composition"
  | "growth"
  | "strategies"
  | "tax"
  | "stress";

/** DOM / stack order below tablet width. */
export const RENTAL_WIDGET_ORDER: readonly RentalWidgetId[] = [
  "overview",
  "income",
  "operating-expenses",
  "pro-forma",
  "composition",
  "growth",
  "strategies",
  "tax",
  "stress",
] as const;

type RentalWidgetLayouts = Record<RentalWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Rental board.
 *
 * Wide (lg ≤62 rows): overview ribbon+KPIs full width; Income | OpEx;
 * pro-forma w8 beside composition/growth stack w4; Strategies | Tax; Stress full width.
 *
 * Medium (md): same packing scaled to 10 columns (pro-forma w6 | stack w4).
 */
export const RENTAL_WIDGET_DEFAULT_LAYOUTS: RentalWidgetLayouts = {
  overview: {
    lg: { x: 0, y: 0, w: 12, h: 10, minW: 6, minH: 8 },
    md: { x: 0, y: 0, w: 10, h: 10, minW: 5, minH: 8 },
    sm: { x: 0, y: 0, w: 6, h: 14, minW: 6, maxW: 6, minH: 8 },
  },
  income: {
    lg: { x: 0, y: 10, w: 6, h: 16, minW: 4, minH: 12 },
    md: { x: 0, y: 10, w: 5, h: 16, minW: 4, minH: 12 },
    sm: { x: 0, y: 14, w: 6, h: 16, minW: 6, maxW: 6, minH: 12 },
  },
  "operating-expenses": {
    lg: { x: 6, y: 10, w: 6, h: 16, minW: 4, minH: 12 },
    md: { x: 5, y: 10, w: 5, h: 16, minW: 4, minH: 12 },
    sm: { x: 0, y: 30, w: 6, h: 18, minW: 6, maxW: 6, minH: 12 },
  },
  "pro-forma": {
    lg: { x: 0, y: 26, w: 8, h: 14, minW: 5, minH: 10 },
    md: { x: 0, y: 26, w: 6, h: 14, minW: 4, minH: 10 },
    sm: { x: 0, y: 48, w: 6, h: 18, minW: 6, maxW: 6, minH: 10 },
  },
  composition: {
    lg: { x: 8, y: 26, w: 4, h: 7, minW: 3, minH: 5 },
    md: { x: 6, y: 26, w: 4, h: 7, minW: 3, minH: 5 },
    sm: { x: 0, y: 66, w: 6, h: 8, minW: 6, maxW: 6, minH: 5 },
  },
  growth: {
    lg: { x: 8, y: 33, w: 4, h: 7, minW: 3, minH: 5 },
    md: { x: 6, y: 33, w: 4, h: 7, minW: 3, minH: 5 },
    sm: { x: 0, y: 74, w: 6, h: 8, minW: 6, maxW: 6, minH: 5 },
  },
  strategies: {
    lg: { x: 0, y: 40, w: 6, h: 12, minW: 4, minH: 8 },
    md: { x: 0, y: 40, w: 5, h: 12, minW: 4, minH: 8 },
    sm: { x: 0, y: 82, w: 6, h: 12, minW: 6, maxW: 6, minH: 8 },
  },
  tax: {
    lg: { x: 6, y: 40, w: 6, h: 12, minW: 4, minH: 8 },
    md: { x: 5, y: 40, w: 5, h: 12, minW: 4, minH: 8 },
    sm: { x: 0, y: 94, w: 6, h: 12, minW: 6, maxW: 6, minH: 8 },
  },
  stress: {
    lg: { x: 0, y: 52, w: 12, h: 10, minW: 6, minH: 8 },
    md: { x: 0, y: 52, w: 10, h: 10, minW: 5, minH: 8 },
    sm: { x: 0, y: 106, w: 6, h: 12, minW: 6, maxW: 6, minH: 8 },
  },
};

/** Bottom row of the recommended lg packing (y + h of the lowest widget). */
export function rentalLgBoardBottom(): number {
  let bottom = 0;
  for (const id of RENTAL_WIDGET_ORDER) {
    const lg = RENTAL_WIDGET_DEFAULT_LAYOUTS[id].lg;
    if (!lg) continue;
    bottom = Math.max(bottom, lg.y + lg.h);
  }
  return bottom;
}

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function rentalWidgetLgLayout(id: RentalWidgetId): WidgetLayoutPartial {
  const lg = RENTAL_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for rental widget ${id}`);
  return lg;
}

export function rentalWidgetLayouts(id: RentalWidgetId): WidgetBreakpointLayouts {
  return RENTAL_WIDGET_DEFAULT_LAYOUTS[id];
}
