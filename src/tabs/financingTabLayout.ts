import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../widgets/widgetLayout";

/** Bump when Financing recommended coordinates change (opt-in via “Use recommended layout”). */
export const FINANCING_BOARD_LAYOUT_REVISION = 3;

/** Preset id stored on the Financing board v3 envelope. */
export const FINANCING_BOARD_PRESET = "compact-side-by-side";

export type FinancingWidgetId =
  | "loan"
  | "loan-product"
  | "external-rate-estimates"
  | "affordability"
  | "term-tools";

/** DOM / stack order below tablet width. */
export const FINANCING_WIDGET_ORDER: readonly FinancingWidgetId[] = [
  "loan",
  "loan-product",
  "external-rate-estimates",
  "affordability",
  "term-tools",
] as const;

type FinancingWidgetLayouts = Record<FinancingWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Financing board.
 *
 * Wide (lg): Loan & payment full width; Loan Product w7 | Rate Suggestions w5;
 * Affordability w5 | Term Tools w7.
 *
 * Medium (md): product/rates 5+5; affordability and term tools full width.
 *
 * Rate Suggestions is tall enough for fetch/list/alerts plus the Apply CTA.
 */
export const FINANCING_WIDGET_DEFAULT_LAYOUTS: FinancingWidgetLayouts = {
  loan: {
    lg: { x: 0, y: 0, w: 12, h: 14, minW: 6, minH: 10 },
    md: { x: 0, y: 0, w: 10, h: 14, minW: 5, minH: 10 },
    sm: { x: 0, y: 0, w: 6, h: 16, minW: 6, maxW: 6, minH: 10 },
  },
  "loan-product": {
    lg: { x: 0, y: 14, w: 7, h: 20, minW: 4, minH: 8 },
    md: { x: 0, y: 14, w: 5, h: 20, minW: 4, minH: 8 },
    sm: { x: 0, y: 16, w: 6, h: 14, minW: 6, maxW: 6, minH: 8 },
  },
  "external-rate-estimates": {
    lg: { x: 7, y: 14, w: 5, h: 20, minW: 4, minH: 12 },
    md: { x: 5, y: 14, w: 5, h: 20, minW: 4, minH: 12 },
    sm: { x: 0, y: 30, w: 6, h: 20, minW: 6, maxW: 6, minH: 12 },
  },
  affordability: {
    lg: { x: 0, y: 34, w: 5, h: 18, minW: 4, minH: 10 },
    md: { x: 0, y: 34, w: 10, h: 16, minW: 5, minH: 10 },
    sm: { x: 0, y: 50, w: 6, h: 18, minW: 6, maxW: 6, minH: 10 },
  },
  "term-tools": {
    lg: { x: 5, y: 34, w: 7, h: 18, minW: 4, minH: 10 },
    md: { x: 0, y: 50, w: 10, h: 18, minW: 5, minH: 10 },
    sm: { x: 0, y: 68, w: 6, h: 18, minW: 6, maxW: 6, minH: 10 },
  },
};

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function financingWidgetLgLayout(id: FinancingWidgetId): WidgetLayoutPartial {
  const lg = FINANCING_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for financing widget ${id}`);
  return lg;
}

export function financingWidgetLayouts(id: FinancingWidgetId): WidgetBreakpointLayouts {
  return FINANCING_WIDGET_DEFAULT_LAYOUTS[id];
}
