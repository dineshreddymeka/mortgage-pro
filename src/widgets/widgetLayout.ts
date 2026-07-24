import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

/** Breakpoints persisted / generated for widget boards. */
export type WidgetBreakpoint = "lg" | "md" | "sm" | "xs";

export type WidgetLayoutPartial = Omit<LayoutItem, "i"> & { i?: string };

/** Optional explicit per-breakpoint defaults; missing keys derive from `defaultLayout`. */
export type WidgetBreakpointLayouts = Partial<Record<WidgetBreakpoint, WidgetLayoutPartial>>;

export type WidgetDef = {
  id: string;
  title: string;
  description?: string;
  /**
   * Default grid item for the `lg` breakpoint (12 cols).
   * Kept for backward compatibility; prefer `defaultLayouts.lg` when setting per-bp defaults.
   */
  defaultLayout: WidgetLayoutPartial;
  /** Explicit lg/md/sm(/xs) defaults. Unspecified breakpoints are derived. */
  defaultLayouts?: WidgetBreakpointLayouts;
  /**
   * Explicit scroll control for natural-height stacks (e.g. tall tables).
   * Desktop fixed-height cells always use safe overflow:auto; this flag cannot disable that.
   */
  scrollBody?: boolean;
};

export type WidgetLayoutPersistOptions = {
  /**
   * Board-specific layout preset revision.
   * Bump when recommended defaults change so users can opt into the new preset
   * without silently discarding a custom layout.
   */
  layoutRevision?: number;
  /** Optional board preset id (e.g. compact-side-by-side). */
  preset?: string;
};

/**
 * Widget layout localStorage schema version.
 * v1/v2 stored bare ResponsiveLayouts under versioned prefixes.
 * v3 stores a validated envelope (revision + layouts) and migrates v1/v2 when present.
 */
export const WIDGET_LAYOUT_STORAGE_VERSION = 3;

/** Default compact row height for migrated boards. */
export const DEFAULT_WIDGET_ROW_HEIGHT = 28;

/**
 * Boards that still rely on the pre-compact physical row height until their tab
 * explicitly opts into the compact default (by passing `rowHeight`).
 */
export const LEGACY_BOARD_ROW_HEIGHT: Readonly<Record<string, number>> = {
  research: 36,
};

/** Resolve row height: explicit prop wins; else legacy board map; else compact default. */
export function resolveBoardRowHeight(boardId: string, rowHeight?: number): number {
  if (rowHeight != null) return rowHeight;
  return LEGACY_BOARD_ROW_HEIGHT[boardId] ?? DEFAULT_WIDGET_ROW_HEIGHT;
}

const STORAGE_ROOT = "mortgage-pro:widget-layout";

export type PersistedWidgetLayouts = {
  version: typeof WIDGET_LAYOUT_STORAGE_VERSION;
  layoutRevision: number;
  preset?: string;
  layouts: ResponsiveLayouts;
};

export type LoadedLayoutState = {
  layouts: ResponsiveLayouts;
  /** Revision recorded with the loaded/migrated save. */
  storedRevision: number;
  preset?: string;
  /**
   * True only when a v3 envelope carries an older explicit revision than the board.
   * Fresh v1/v2 migrations adopt the current board revision and are not flagged.
   */
  hasRecommendedUpdate: boolean;
  /** Where the coordinates came from. */
  source: "defaults" | "v3" | "v2" | "v1";
};

const BREAKPOINTS: WidgetBreakpoint[] = ["lg", "md", "sm", "xs"];
const COLS: Record<WidgetBreakpoint, number> = { lg: 12, md: 10, sm: 6, xs: 4 };

export function layoutStorageKey(
  boardId: string,
  version: number = WIDGET_LAYOUT_STORAGE_VERSION
): string {
  return `${STORAGE_ROOT}:v${version}:${boardId}`;
}

function asItem(partial: WidgetLayoutPartial, id: string): LayoutItem {
  const rest = { ...partial };
  delete rest.i;
  return { ...rest, i: id };
}

function deriveMd(item: LayoutItem): LayoutItem {
  const w = Math.min(COLS.md, item.w);
  return {
    ...item,
    w,
    x: Math.min(item.x, Math.max(0, COLS.md - w)),
    maxW: item.maxW == null ? undefined : Math.min(item.maxW, COLS.md),
  };
}

function deriveSm(item: LayoutItem, index: number): LayoutItem {
  const w = Math.min(COLS.sm, item.w);
  const minW = Math.min(w, item.minW ?? w);
  return {
    ...item,
    w: COLS.sm,
    minW,
    maxW: COLS.sm,
    x: 0,
    y: index * Math.max(item.h, 4),
  };
}

function deriveXs(item: LayoutItem, index: number): LayoutItem {
  const h = Math.min(item.h, 12);
  return {
    ...item,
    w: COLS.xs,
    minW: COLS.xs,
    maxW: COLS.xs,
    h,
    minH: Math.min(item.minH ?? 4, h),
    x: 0,
    y: index * Math.max(h, 4),
  };
}

function resolveLgPartial(w: WidgetDef): WidgetLayoutPartial {
  return w.defaultLayouts?.lg ?? w.defaultLayout;
}

/** Build responsive defaults from widget defs (explicit lg/md/sm or derived). */
export function buildDefaultLayouts(widgets: WidgetDef[]): ResponsiveLayouts {
  const lg: Layout = widgets.map((w) => asItem(resolveLgPartial(w), w.id));

  const md: Layout = widgets.map((w, index) => {
    const explicit = w.defaultLayouts?.md;
    if (explicit) return asItem(explicit, w.id);
    return deriveMd(lg[index]!);
  });

  const sm: Layout = widgets.map((w, index) => {
    const explicit = w.defaultLayouts?.sm;
    if (explicit) return asItem(explicit, w.id);
    return deriveSm(lg[index]!, index);
  });

  const xs: Layout = widgets.map((w, index) => {
    const explicit = w.defaultLayouts?.xs;
    if (explicit) return asItem(explicit, w.id);
    return deriveXs(lg[index]!, index);
  });

  return { lg, md, sm, xs };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function clampPositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

/** Validate and normalize one layout item; returns null when unusable. */
export function sanitizeLayoutItem(
  raw: unknown,
  fallback: LayoutItem,
  cols: number
): LayoutItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.i === "string" && item.i.length > 0 ? item.i : fallback.i;
  if (id !== fallback.i) return null;

  if (
    !isFiniteNumber(item.x) ||
    !isFiniteNumber(item.y) ||
    !isFiniteNumber(item.w) ||
    !isFiniteNumber(item.h)
  ) {
    return null;
  }

  const xRaw = item.x;
  const yRaw = item.y;
  const wRaw = item.w;
  const hRaw = item.h;

  // Reject negatives / non-positive sizes rather than inventing positions.
  if (xRaw < 0 || yRaw < 0 || wRaw <= 0 || hRaw <= 0) return null;

  const w = Math.min(cols, clampPositive(wRaw, fallback.w));
  const x = Math.min(clampNonNegative(xRaw), Math.max(0, cols - w));
  const y = clampNonNegative(yRaw);
  const h = clampPositive(hRaw, fallback.h);

  const next: LayoutItem = { ...fallback, i: id, x, y, w, h };

  if (isFiniteNumber(item.minW)) next.minW = Math.max(1, Math.min(cols, item.minW));
  if (isFiniteNumber(item.minH)) next.minH = Math.max(1, item.minH);
  if (isFiniteNumber(item.maxW)) next.maxW = Math.max(1, Math.min(cols, item.maxW));
  if (isFiniteNumber(item.maxH)) next.maxH = Math.max(1, item.maxH);
  if (typeof item.static === "boolean") next.static = item.static;
  if (typeof item.isDraggable === "boolean") next.isDraggable = item.isDraggable;
  if (typeof item.isResizable === "boolean") next.isResizable = item.isResizable;

  return next;
}

function sanitizeBreakpoint(
  raw: unknown,
  fallback: Layout,
  cols: number
): Layout {
  const byId = new Map<string, LayoutItem>();
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const id = (entry as { i?: unknown }).i;
      if (typeof id !== "string" || !id) continue;
      // Duplicates: keep the first valid occurrence.
      if (byId.has(id)) continue;
      const fb = fallback.find((d) => d.i === id);
      if (!fb) continue; // unknown widget id
      const clean = sanitizeLayoutItem(entry, fb, cols);
      if (clean) byId.set(id, clean);
    }
  }
  // Stable order follows widget/default order; missing ids get defaults.
  return fallback.map((d) => byId.get(d.i) ?? d);
}

/** Validate a ResponsiveLayouts-like object against current widget defaults. */
export function sanitizeLayouts(
  raw: unknown,
  defaults: ResponsiveLayouts
): ResponsiveLayouts | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed = raw as Partial<Record<WidgetBreakpoint, unknown>>;
  const hasAnyBp = BREAKPOINTS.some((bp) => Array.isArray(parsed[bp]));
  if (!hasAnyBp) return null;

  return {
    lg: sanitizeBreakpoint(parsed.lg, defaults.lg ?? [], COLS.lg),
    md: sanitizeBreakpoint(parsed.md, defaults.md ?? [], COLS.md),
    sm: sanitizeBreakpoint(parsed.sm, defaults.sm ?? [], COLS.sm),
    xs: sanitizeBreakpoint(parsed.xs, defaults.xs ?? [], COLS.xs),
  };
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isPersistEnvelope(value: unknown): value is PersistedWidgetLayouts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === WIDGET_LAYOUT_STORAGE_VERSION &&
    v.layouts != null &&
    typeof v.layouts === "object" &&
    !Array.isArray(v.layouts)
  );
}

function extractLayoutsPayload(parsed: unknown): {
  layouts: unknown;
  layoutRevision: number;
  preset?: string;
  enveloped: boolean;
} | null {
  if (!parsed || typeof parsed !== "object") return null;
  if (isPersistEnvelope(parsed)) {
    return {
      layouts: parsed.layouts,
      layoutRevision: isFiniteNumber(parsed.layoutRevision)
        ? Math.max(0, Math.floor(parsed.layoutRevision))
        : 0,
      preset: typeof parsed.preset === "string" ? parsed.preset : undefined,
      enveloped: true,
    };
  }
  // Bare ResponsiveLayouts (v1/v2 or legacy v3 write).
  const record = parsed as Record<string, unknown>;
  if (BREAKPOINTS.some((bp) => Array.isArray(record[bp]))) {
    return { layouts: parsed, layoutRevision: 0, enveloped: false };
  }
  return null;
}

function toEnvelope(
  layouts: ResponsiveLayouts,
  options?: WidgetLayoutPersistOptions
): PersistedWidgetLayouts {
  const envelope: PersistedWidgetLayouts = {
    version: WIDGET_LAYOUT_STORAGE_VERSION,
    layoutRevision: Math.max(0, Math.floor(options?.layoutRevision ?? 1)),
    layouts,
  };
  if (options?.preset) envelope.preset = options.preset;
  return envelope;
}

function readStoredLayouts(boardId: string): ResponsiveLayouts | undefined {
  const raw = readStorage(layoutStorageKey(boardId, WIDGET_LAYOUT_STORAGE_VERSION));
  if (!raw) return undefined;
  const payload = extractLayoutsPayload(parseJson(raw));
  if (!payload || !payload.layouts || typeof payload.layouts !== "object") return undefined;
  return payload.layouts as ResponsiveLayouts;
}

/**
 * Revision to persist for interactive drag/resize saves.
 * Never keeps a legacy `0` from bare v1/v2 payloads.
 */
export function revisionForDragSave(
  storedRevision: number,
  boardRevision: number
): number {
  const board = Math.max(1, Math.floor(boardRevision));
  if (!Number.isFinite(storedRevision) || storedRevision <= 0) return board;
  return Math.floor(storedRevision);
}

/**
 * Load layouts for a board, migrating validated v1/v2 saves into the v3 envelope
 * when needed. Malformed data falls back to defaults without wiping older keys until
 * a successful save/clear.
 */
export function loadLayoutState(
  boardId: string,
  widgets: WidgetDef[],
  options?: WidgetLayoutPersistOptions
): LoadedLayoutState {
  const defaults = buildDefaultLayouts(widgets);
  const currentRevision = Math.max(1, Math.floor(options?.layoutRevision ?? 1));

  const tryLoad = (
    version: 1 | 2 | 3,
    source: LoadedLayoutState["source"]
  ): LoadedLayoutState | null => {
    const raw = readStorage(layoutStorageKey(boardId, version));
    if (!raw) return null;
    const parsed = parseJson(raw);
    const payload = extractLayoutsPayload(parsed);
    if (!payload) return null;
    const layouts = sanitizeLayouts(payload.layouts, defaults);
    if (!layouts) return null;

    // v1/v2 (and bare payloads) adopt the current board revision — custom coords are
    // preserved, but they are not falsely flagged as an outdated preset.
    const storedRevision =
      source === "v3" && payload.enveloped
        ? payload.layoutRevision > 0
          ? payload.layoutRevision
          : currentRevision
        : currentRevision;

    const state: LoadedLayoutState = {
      layouts,
      storedRevision,
      preset: payload.preset ?? options?.preset,
      hasRecommendedUpdate:
        source === "v3" && payload.enveloped && payload.layoutRevision > 0
          ? payload.layoutRevision < currentRevision
          : false,
      source,
    };

    // Write-through migrate legacy prefixes / bare / revision-0 envelopes into v3.
    if (source !== "v3" || !payload.enveloped || payload.layoutRevision <= 0) {
      writeStorage(
        layoutStorageKey(boardId, WIDGET_LAYOUT_STORAGE_VERSION),
        JSON.stringify(
          toEnvelope(layouts, {
            layoutRevision: storedRevision,
            preset: payload.preset ?? options?.preset,
          })
        )
      );
    }

    return state;
  };

  return (
    tryLoad(3, "v3") ??
    tryLoad(2, "v2") ??
    tryLoad(1, "v1") ?? {
      layouts: defaults,
      storedRevision: currentRevision,
      preset: options?.preset,
      hasRecommendedUpdate: false,
      source: "defaults",
    }
  );
}

/** Convenience wrapper matching the historical API. */
export function loadLayouts(
  boardId: string,
  widgets: WidgetDef[],
  options?: WidgetLayoutPersistOptions
): ResponsiveLayouts {
  return loadLayoutState(boardId, widgets, options).layouts;
}

/**
 * Persist layouts. Omitted breakpoints are preserved from the existing v3 save
 * so a partial RGL callback cannot wipe md/sm/xs.
 */
export function saveLayouts(
  boardId: string,
  layouts: ResponsiveLayouts,
  options?: WidgetLayoutPersistOptions
): void {
  const previous = readStoredLayouts(boardId);
  const next: ResponsiveLayouts = { ...(previous ?? {}) };

  for (const bp of BREAKPOINTS) {
    const incoming = layouts[bp];
    if (incoming === undefined) continue;
    const fallback = (previous?.[bp] ?? incoming) as Layout;
    next[bp] = sanitizeBreakpoint(incoming, fallback, COLS[bp]);
  }

  writeStorage(
    layoutStorageKey(boardId, WIDGET_LAYOUT_STORAGE_VERSION),
    JSON.stringify(toEnvelope(next, options))
  );
}

/** Remove v1/v2/v3 keys for the board. */
export function clearLayouts(boardId: string): void {
  removeStorage(layoutStorageKey(boardId, 1));
  removeStorage(layoutStorageKey(boardId, 2));
  removeStorage(layoutStorageKey(boardId, 3));
}

/** Apply current recommended defaults and persist them at the board revision. */
export function applyRecommendedLayouts(
  boardId: string,
  widgets: WidgetDef[],
  options?: WidgetLayoutPersistOptions
): ResponsiveLayouts {
  const layouts = buildDefaultLayouts(widgets);
  // Full recommended set replaces all breakpoints intentionally.
  writeStorage(
    layoutStorageKey(boardId, WIDGET_LAYOUT_STORAGE_VERSION),
    JSON.stringify(
      toEnvelope(layouts, {
        layoutRevision: options?.layoutRevision ?? 1,
        preset: options?.preset,
      })
    )
  );
  removeStorage(layoutStorageKey(boardId, 1));
  removeStorage(layoutStorageKey(boardId, 2));
  return layouts;
}
