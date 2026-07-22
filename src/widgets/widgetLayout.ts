import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

export type WidgetDef = {
  id: string;
  title: string;
  description?: string;
  /** Default grid item for the `lg` breakpoint (12 cols). */
  defaultLayout: Omit<LayoutItem, "i"> & { i?: string };
};

const STORAGE_PREFIX = "mortgage-pro:widget-layout:v1:";

export function layoutStorageKey(boardId: string): string {
  return `${STORAGE_PREFIX}${boardId}`;
}

function asItem(w: WidgetDef): LayoutItem {
  const rest = { ...w.defaultLayout };
  delete rest.i;
  return { ...rest, i: w.id };
}

export function buildDefaultLayouts(widgets: WidgetDef[]): ResponsiveLayouts {
  const lg: Layout = widgets.map(asItem);
  const md: Layout = lg.map((item) => ({
    ...item,
    w: Math.min(10, item.w),
    x: Math.min(item.x, Math.max(0, 10 - Math.min(10, item.w))),
  }));
  const sm: Layout = lg.map((item, index) => {
    const w = Math.min(6, item.w);
    const minW = Math.min(w, item.minW ?? w);
    return {
      ...item,
      w: 6,
      minW,
      maxW: 6,
      x: 0,
      y: index * Math.max(item.h, 4),
    };
  });
  const xs: Layout = lg.map((item, index) => {
    const h = Math.min(item.h, 12);
    return {
      ...item,
      w: 4,
      minW: 4,
      maxW: 4,
      h,
      minH: Math.min(item.minH ?? 4, h),
      x: 0,
      y: index * Math.max(h, 4),
    };
  });
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
  } catch {
    /* ignore */
  }
}
