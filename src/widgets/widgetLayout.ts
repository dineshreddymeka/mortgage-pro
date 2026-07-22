import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

export type WidgetDef = {
  id: string;
  title: string;
  description?: string;
  /** When true, frame shows a collapse control that shrinks the grid item to a header. */
  collapsible?: boolean;
  /** Default grid item for the `lg` breakpoint (12 cols). */
  defaultLayout: Omit<LayoutItem, "i"> & { i?: string };
};

/** Grid rows used when a collapsible widget is collapsed to its title bar. */
export const COLLAPSED_WIDGET_H = 2;

const STORAGE_PREFIX = "mortgage-pro:widget-layout:v1:";
const COLLAPSED_PREFIX = "mortgage-pro:widget-collapsed:v1:";
const EXPANDED_H_PREFIX = "mortgage-pro:widget-expanded-h:v1:";

export function layoutStorageKey(boardId: string): string {
  return `${STORAGE_PREFIX}${boardId}`;
}

export function collapsedStorageKey(boardId: string): string {
  return `${COLLAPSED_PREFIX}${boardId}`;
}

export function expandedHeightsStorageKey(boardId: string): string {
  return `${EXPANDED_H_PREFIX}${boardId}`;
}

export function loadCollapsedIds(boardId: string): Set<string> {
  try {
    const raw = localStorage.getItem(collapsedStorageKey(boardId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function saveCollapsedIds(boardId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(collapsedStorageKey(boardId), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/** Per-breakpoint saved heights for collapsed widgets (so expand restores size). */
export type ExpandedHeights = Record<string, Partial<Record<"lg" | "md" | "sm" | "xs", number>>>;

export function loadExpandedHeights(boardId: string): ExpandedHeights {
  try {
    const raw = localStorage.getItem(expandedHeightsStorageKey(boardId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ExpandedHeights;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveExpandedHeights(boardId: string, heights: ExpandedHeights): void {
  try {
    localStorage.setItem(expandedHeightsStorageKey(boardId), JSON.stringify(heights));
  } catch {
    /* ignore */
  }
}

function asItem(w: WidgetDef): LayoutItem {
  const { i: _ignored, ...rest } = w.defaultLayout;
  return { ...rest, i: w.id };
}

export function buildDefaultLayouts(widgets: WidgetDef[]): ResponsiveLayouts {
  const lg: Layout = widgets.map(asItem);
  const md: Layout = lg.map((item) => ({
    ...item,
    w: Math.min(10, item.w),
    x: Math.min(item.x, Math.max(0, 10 - Math.min(10, item.w))),
  }));
  const sm: Layout = lg.map((item, index) => ({
    ...item,
    w: 6,
    x: 0,
    y: index * Math.max(item.h, 4),
  }));
  const xs: Layout = lg.map((item, index) => ({
    ...item,
    w: 4,
    x: 0,
    y: index * Math.max(item.h, 4),
  }));
  return { lg, md, sm, xs };
}

export function loadLayouts(boardId: string, widgets: WidgetDef[]): ResponsiveLayouts {
  const defaults = buildDefaultLayouts(widgets);
  try {
    const raw = localStorage.getItem(layoutStorageKey(boardId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as ResponsiveLayouts;
    if (!parsed || typeof parsed !== "object") return defaults;
    const ids = new Set(widgets.map((w) => w.id));
    const mergeBp = (bp: Layout | undefined, fallback: Layout): Layout => {
      const map = new Map((bp ?? []).filter((l) => ids.has(l.i)).map((l) => [l.i, l]));
      return fallback.map((d) => map.get(d.i) ?? d);
    };
    return {
      lg: mergeBp(parsed.lg, defaults.lg ?? []),
      md: mergeBp(parsed.md, defaults.md ?? []),
      sm: mergeBp(parsed.sm, defaults.sm ?? []),
      xs: mergeBp(parsed.xs, defaults.xs ?? []),
    };
  } catch {
    return defaults;
  }
}

export function saveLayouts(boardId: string, layouts: ResponsiveLayouts): void {
  try {
    localStorage.setItem(layoutStorageKey(boardId), JSON.stringify(layouts));
  } catch {
    /* ignore */
  }
}

export function clearLayouts(boardId: string): void {
  try {
    localStorage.removeItem(layoutStorageKey(boardId));
    localStorage.removeItem(collapsedStorageKey(boardId));
    localStorage.removeItem(expandedHeightsStorageKey(boardId));
  } catch {
    /* ignore */
  }
}

/** Apply collapsed row heights across breakpoints without mutating other fields. */
export function applyCollapsedHeights(
  layouts: ResponsiveLayouts,
  collapsedIds: Set<string>
): ResponsiveLayouts {
  if (collapsedIds.size === 0) return layouts;
  const patch = (bp: Layout | undefined): Layout | undefined => {
    if (!bp) return bp;
    return bp.map((item) =>
      collapsedIds.has(item.i)
        ? { ...item, h: COLLAPSED_WIDGET_H, minH: COLLAPSED_WIDGET_H }
        : item
    );
  };
  return {
    lg: patch(layouts.lg),
    md: patch(layouts.md),
    sm: patch(layouts.sm),
    xs: patch(layouts.xs),
  };
}
