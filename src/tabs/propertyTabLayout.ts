import type { WidgetBreakpointLayouts, WidgetLayoutPartial } from "../widgets/widgetLayout";

/** Bump when Property recommended coordinates change (opt-in via “Use recommended layout”). */
export const PROPERTY_BOARD_LAYOUT_REVISION = 3;

/** Preset id stored on the Property board v3 envelope. */
export const PROPERTY_BOARD_PRESET = "compact-side-by-side";

export type PropertyWidgetId =
  | "identity"
  | "location"
  | "location-costs"
  | "external-estimates"
  | "account"
  | "scenario-import"
  | "collaboration"
  | "share-snapshots";

/** DOM / stack order: essentials first, then administration. */
export const PROPERTY_WIDGET_ORDER: readonly PropertyWidgetId[] = [
  "identity",
  "location",
  "location-costs",
  "external-estimates",
  "account",
  "scenario-import",
  "collaboration",
  "share-snapshots",
] as const;

type PropertyWidgetLayouts = Record<PropertyWidgetId, WidgetBreakpointLayouts>;

/**
 * Explicit lg (12) / md (10) / sm (6) defaults for the Property board.
 *
 * Wide (lg): name w4 + location w8; hints under name; estimates beside
 * account+import stack; collaborators | share.
 */
export const PROPERTY_WIDGET_DEFAULT_LAYOUTS: PropertyWidgetLayouts = {
  identity: {
    lg: { x: 0, y: 0, w: 4, h: 7, minW: 3, minH: 4 },
    md: { x: 0, y: 0, w: 4, h: 7, minW: 3, minH: 4 },
    sm: { x: 0, y: 0, w: 6, h: 7, minW: 6, maxW: 6, minH: 4 },
  },
  location: {
    lg: { x: 4, y: 0, w: 8, h: 15, minW: 4, minH: 8 },
    md: { x: 4, y: 0, w: 6, h: 15, minW: 4, minH: 8 },
    sm: { x: 0, y: 7, w: 6, h: 14, minW: 6, maxW: 6, minH: 8 },
  },
  "location-costs": {
    lg: { x: 0, y: 7, w: 4, h: 8, minW: 3, minH: 5 },
    md: { x: 0, y: 7, w: 4, h: 8, minW: 3, minH: 5 },
    sm: { x: 0, y: 21, w: 6, h: 8, minW: 6, maxW: 6, minH: 5 },
  },
  "external-estimates": {
    lg: { x: 0, y: 15, w: 6, h: 16, minW: 4, minH: 8 },
    md: { x: 0, y: 15, w: 5, h: 16, minW: 4, minH: 8 },
    sm: { x: 0, y: 29, w: 6, h: 16, minW: 6, maxW: 6, minH: 8 },
  },
  account: {
    lg: { x: 6, y: 15, w: 6, h: 9, minW: 4, minH: 5 },
    md: { x: 5, y: 15, w: 5, h: 9, minW: 3, minH: 5 },
    sm: { x: 0, y: 45, w: 6, h: 9, minW: 6, maxW: 6, minH: 5 },
  },
  "scenario-import": {
    lg: { x: 6, y: 24, w: 6, h: 8, minW: 4, minH: 4 },
    md: { x: 5, y: 24, w: 5, h: 8, minW: 3, minH: 4 },
    sm: { x: 0, y: 54, w: 6, h: 8, minW: 6, maxW: 6, minH: 4 },
  },
  collaboration: {
    lg: { x: 0, y: 32, w: 6, h: 16, minW: 4, minH: 6 },
    md: { x: 0, y: 32, w: 5, h: 16, minW: 3, minH: 6 },
    sm: { x: 0, y: 62, w: 6, h: 16, minW: 6, maxW: 6, minH: 6 },
  },
  "share-snapshots": {
    lg: { x: 6, y: 32, w: 6, h: 16, minW: 4, minH: 6 },
    md: { x: 5, y: 32, w: 5, h: 16, minW: 3, minH: 6 },
    sm: { x: 0, y: 78, w: 6, h: 16, minW: 6, maxW: 6, minH: 6 },
  },
};

/** lg item used as `defaultLayout` for backward-compatible WidgetDef shape. */
export function propertyWidgetLgLayout(id: PropertyWidgetId): WidgetLayoutPartial {
  const lg = PROPERTY_WIDGET_DEFAULT_LAYOUTS[id].lg;
  if (!lg) throw new Error(`Missing lg layout for property widget ${id}`);
  return lg;
}

export function propertyWidgetLayouts(id: PropertyWidgetId): WidgetBreakpointLayouts {
  return PROPERTY_WIDGET_DEFAULT_LAYOUTS[id];
}
