import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../../widgets/widgetLayout";

/** Bump when Exit recommended coordinates / widget IDs change (opt-in via “Use recommended layout”). */
export const EXIT_BOARD_LAYOUT_REVISION = 2;

/** Preset id stored on the Exit board v3 envelope. */
export const EXIT_BOARD_PRESET = "compact-side-by-side";

/** Wide (lg) recommended board bottom — keep page scroll in check (old stacked board ≈102). */
export const EXIT_LG_MAX_ROWS = 70;

export type ExitWidgetId =
  | "overview"
  | "sale-assumptions"
  | "rental-yield"
  | "tax"
  | "milestones"
  | "yearly-projection"
  | "amortization"
  | "rent-vs-buy";

/** DOM / stack order below tablet width. */
export const EXIT_WIDGET_ORDER: readonly ExitWidgetId[] = [
  "overview",
  "sale-assumptions",
  "rental-yield",
  "milestones",
  "tax",
  "yearly-projection",
  "amortization",
  "rent-vs-buy",
] as const;

type ExitWidgetLayouts = Record<ExitWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Exit board.
 *
 * Wide (lg ≤70 rows): overview h8 for Edit CTAs; Sale | Yield (taller for helpers);
 * Milestones w8 | Tax w4 (milestones tall for matrix|detail side-by-side);
 * Yearly w7 | Amortization w5; Rent vs buy full width.
 */
export const EXIT_WIDGET_DEFAULT_LAYOUTS: ExitWidgetLayouts = {
  overview: {
    lg: { x: 0, y: 0, w: 12, h: 8, minW: 6, minH: 6 },
    md: { x: 0, y: 0, w: 10, h: 8, minW: 5, minH: 6 },
    sm: { x: 0, y: 0, w: 6, h: 10, minW: 6, maxW: 6, minH: 6 },
  },
  "sale-assumptions": {
    lg: { x: 0, y: 8, w: 6, h: 13, minW: 4, minH: 10 },
    md: { x: 0, y: 8, w: 5, h: 13, minW: 4, minH: 10 },
    sm: { x: 0, y: 10, w: 6, h: 15, minW: 6, maxW: 6, minH: 10 },
  },
  "rental-yield": {
    lg: { x: 6, y: 8, w: 6, h: 13, minW: 4, minH: 10 },
    md: { x: 5, y: 8, w: 5, h: 13, minW: 4, minH: 10 },
    sm: { x: 0, y: 25, w: 6, h: 16, minW: 6, maxW: 6, minH: 10 },
  },
  milestones: {
    lg: { x: 0, y: 21, w: 8, h: 18, minW: 5, minH: 14 },
    md: { x: 0, y: 21, w: 6, h: 18, minW: 4, minH: 14 },
    sm: { x: 0, y: 41, w: 6, h: 20, minW: 6, maxW: 6, minH: 14 },
  },
  tax: {
    lg: { x: 8, y: 21, w: 4, h: 18, minW: 3, minH: 10 },
    md: { x: 6, y: 21, w: 4, h: 18, minW: 3, minH: 10 },
    sm: { x: 0, y: 61, w: 6, h: 14, minW: 6, maxW: 6, minH: 10 },
  },
  "yearly-projection": {
    lg: { x: 0, y: 39, w: 7, h: 12, minW: 4, minH: 10 },
    md: { x: 0, y: 39, w: 6, h: 12, minW: 4, minH: 10 },
    sm: { x: 0, y: 75, w: 6, h: 16, minW: 6, maxW: 6, minH: 10 },
  },
  amortization: {
    lg: { x: 7, y: 39, w: 5, h: 12, minW: 3, minH: 10 },
    md: { x: 6, y: 39, w: 4, h: 12, minW: 3, minH: 10 },
    sm: { x: 0, y: 91, w: 6, h: 12, minW: 6, maxW: 6, minH: 10 },
  },
  "rent-vs-buy": {
    lg: { x: 0, y: 51, w: 12, h: 12, minW: 6, minH: 8 },
    md: { x: 0, y: 51, w: 10, h: 12, minW: 5, minH: 8 },
    sm: { x: 0, y: 103, w: 6, h: 14, minW: 6, maxW: 6, minH: 8 },
  },
};

/** Bottom row of the recommended lg packing (y + h of the lowest widget). */
export function exitLgBoardBottom(): number {
  let bottom = 0;
  for (const id of EXIT_WIDGET_ORDER) {
    const lg = EXIT_WIDGET_DEFAULT_LAYOUTS[id].lg;
    if (!lg) continue;
    bottom = Math.max(bottom, lg.y + lg.h);
  }
  return bottom;
}

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function exitWidgetLgLayout(id: ExitWidgetId): WidgetLayoutPartial {
  const lg = EXIT_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for exit widget ${id}`);
  return lg;
}

export function exitWidgetLayouts(id: ExitWidgetId): WidgetBreakpointLayouts {
  return EXIT_WIDGET_DEFAULT_LAYOUTS[id];
}
