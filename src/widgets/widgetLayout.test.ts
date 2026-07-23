import { beforeEach, describe, expect, it } from "vitest";
import { resolveWidgetBodyOverflow } from "./WidgetFrame";
import {
  DEFAULT_WIDGET_ROW_HEIGHT,
  WIDGET_LAYOUT_STORAGE_VERSION,
  applyRecommendedLayouts,
  buildDefaultLayouts,
  clearLayouts,
  layoutStorageKey,
  loadLayoutState,
  loadLayouts,
  resolveBoardRowHeight,
  revisionForDragSave,
  saveLayouts,
  sanitizeLayoutItem,
  sanitizeLayouts,
  type WidgetDef,
} from "./widgetLayout";

function mockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    _store: store,
  };
}

const sampleWidgets: WidgetDef[] = [
  { id: "a", title: "A", defaultLayout: { x: 0, y: 0, w: 6, h: 8 } },
  { id: "b", title: "B", defaultLayout: { x: 6, y: 0, w: 6, h: 4 } },
];

describe("widgetLayout persistence", () => {
  let storage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    storage = mockLocalStorage();
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
  });

  it("uses the v3 storage prefix for compact layout envelopes", () => {
    expect(WIDGET_LAYOUT_STORAGE_VERSION).toBe(3);
    expect(layoutStorageKey("financing")).toBe("mortgage-pro:widget-layout:v3:financing");
    expect(layoutStorageKey("financing", 1)).toBe("mortgage-pro:widget-layout:v1:financing");
    expect(layoutStorageKey("financing", 2)).toBe("mortgage-pro:widget-layout:v2:financing");
  });

  it("merges saved layouts with defaults when new widgets are added", () => {
    const defaults = buildDefaultLayouts(sampleWidgets);
    saveLayouts("test", defaults, { layoutRevision: 1 });

    const added: WidgetDef = {
      id: "c",
      title: "C",
      defaultLayout: { x: 0, y: 8, w: 12, h: 6 },
    };
    const merged = loadLayouts("test", [...sampleWidgets, added], { layoutRevision: 1 });

    expect(merged.lg?.map((item) => item.i)).toEqual(["a", "b", "c"]);
    expect(merged.lg?.find((item) => item.i === "a")).toMatchObject({ x: 0, y: 0, w: 6, h: 8 });
    expect(merged.lg?.find((item) => item.i === "c")?.y).toBe(8);
  });

  it("preserves saved coordinates for known widget ids", () => {
    const defaults = buildDefaultLayouts(sampleWidgets);
    const custom = {
      ...defaults,
      lg: defaults.lg!.map((item) => (item.i === "a" ? { ...item, x: 3, y: 2 } : item)),
    };
    saveLayouts("test", custom, { layoutRevision: 1 });

    const loaded = loadLayouts("test", sampleWidgets, { layoutRevision: 1 });
    expect(loaded.lg?.find((item) => item.i === "a")).toMatchObject({ x: 3, y: 2 });
  });

  it("drops removed widgets and keeps stable definition order", () => {
    const defaults = buildDefaultLayouts(sampleWidgets);
    saveLayouts("test", defaults, { layoutRevision: 1 });

    const onlyB = loadLayouts("test", [sampleWidgets[1]!], { layoutRevision: 1 });
    expect(onlyB.lg?.map((item) => item.i)).toEqual(["b"]);
  });

  it("honors explicit lg/md/sm defaults while remaining backward compatible with defaultLayout", () => {
    const widgets: WidgetDef[] = [
      {
        id: "loan",
        title: "Loan",
        defaultLayout: { x: 0, y: 0, w: 12, h: 10 },
        defaultLayouts: {
          lg: { x: 0, y: 0, w: 8, h: 12, minW: 4 },
          md: { x: 0, y: 0, w: 6, h: 12, minW: 4 },
          sm: { x: 0, y: 0, w: 6, h: 14, minW: 6, maxW: 6 },
        },
      },
      {
        id: "rates",
        title: "Rates",
        // legacy shape only
        defaultLayout: { x: 8, y: 0, w: 4, h: 12 },
      },
    ];

    const layouts = buildDefaultLayouts(widgets);
    expect(layouts.lg?.find((i) => i.i === "loan")).toMatchObject({ w: 8, h: 12 });
    expect(layouts.md?.find((i) => i.i === "loan")).toMatchObject({ w: 6, h: 12 });
    expect(layouts.sm?.find((i) => i.i === "loan")).toMatchObject({ w: 6, h: 14, x: 0 });
    expect(layouts.lg?.find((i) => i.i === "rates")).toMatchObject({ x: 8, w: 4 });
    expect(layouts.md?.find((i) => i.i === "rates")?.w).toBeLessThanOrEqual(10);
  });

  it("migrates validated v1 saves without falsely flagging them as outdated", () => {
    const legacy = buildDefaultLayouts(sampleWidgets);
    legacy.lg = legacy.lg!.map((item) =>
      item.i === "a" ? { ...item, x: 2, y: 1, w: 5 } : item
    );
    storage.setItem(layoutStorageKey("migrate", 1), JSON.stringify(legacy));

    const state = loadLayoutState("migrate", sampleWidgets, { layoutRevision: 2 });
    expect(state.source).toBe("v1");
    expect(state.layouts.lg?.find((i) => i.i === "a")).toMatchObject({ x: 2, y: 1, w: 5 });
    expect(state.hasRecommendedUpdate).toBe(false);
    expect(state.storedRevision).toBe(2);

    const v3raw = storage.getItem(layoutStorageKey("migrate", 3));
    expect(v3raw).toBeTruthy();
    const envelope = JSON.parse(v3raw!) as {
      version: number;
      layoutRevision: number;
      layouts: unknown;
    };
    expect(envelope.version).toBe(3);
    expect(envelope.layoutRevision).toBe(2);
  });

  it("migrates validated v2 saves into v3 at the current board revision", () => {
    const legacy = buildDefaultLayouts(sampleWidgets);
    legacy.lg = legacy.lg!.map((item) =>
      item.i === "b" ? { ...item, y: 9, h: 7 } : item
    );
    storage.setItem(layoutStorageKey("migrate-v2", 2), JSON.stringify(legacy));

    const state = loadLayoutState("migrate-v2", sampleWidgets, { layoutRevision: 1 });
    expect(state.source).toBe("v2");
    expect(state.layouts.lg?.find((i) => i.i === "b")).toMatchObject({ y: 9, h: 7 });
    expect(state.hasRecommendedUpdate).toBe(false);
    expect(state.storedRevision).toBe(1);
    expect(storage.getItem(layoutStorageKey("migrate-v2", 3))).toBeTruthy();
  });

  it("prefers v3 over older prefixes when both exist", () => {
    const v1 = buildDefaultLayouts(sampleWidgets);
    v1.lg = v1.lg!.map((item) => (item.i === "a" ? { ...item, x: 1 } : item));
    const v3layouts = buildDefaultLayouts(sampleWidgets);
    v3layouts.lg = v3layouts.lg!.map((item) => (item.i === "a" ? { ...item, x: 4 } : item));
    storage.setItem(layoutStorageKey("both", 1), JSON.stringify(v1));
    saveLayouts("both", v3layouts, { layoutRevision: 1 });

    const loaded = loadLayouts("both", sampleWidgets, { layoutRevision: 1 });
    expect(loaded.lg?.find((i) => i.i === "a")?.x).toBe(4);
  });

  it("falls back to defaults for malformed JSON and non-layout objects", () => {
    storage.setItem(layoutStorageKey("bad", 3), "{not-json");
    expect(loadLayouts("bad", sampleWidgets).lg?.map((i) => i.i)).toEqual(["a", "b"]);

    storage.setItem(layoutStorageKey("bad2", 3), JSON.stringify({ hello: "world" }));
    expect(loadLayoutState("bad2", sampleWidgets).source).toBe("defaults");

    storage.setItem(
      layoutStorageKey("bad3", 3),
      JSON.stringify({ version: 3, layoutRevision: 1, layouts: null })
    );
    expect(loadLayoutState("bad3", sampleWidgets).source).toBe("defaults");
  });

  it("rejects negative and non-positive geometry instead of keeping corrupt items", () => {
    const defaults = buildDefaultLayouts(sampleWidgets);
    const fallback = defaults.lg![0]!;
    expect(sanitizeLayoutItem({ i: "a", x: -1, y: 0, w: 6, h: 8 }, fallback, 12)).toBeNull();
    expect(sanitizeLayoutItem({ i: "a", x: 0, y: -2, w: 6, h: 8 }, fallback, 12)).toBeNull();
    expect(sanitizeLayoutItem({ i: "a", x: 0, y: 0, w: 0, h: 8 }, fallback, 12)).toBeNull();
    expect(sanitizeLayoutItem({ i: "a", x: 0, y: 0, w: 6, h: -3 }, fallback, 12)).toBeNull();
    expect(sanitizeLayoutItem({ i: "a", x: "1", y: 0, w: 6, h: 8 }, fallback, 12)).toBeNull();
  });

  it("ignores unknown ids and keeps the first of duplicate ids", () => {
    const defaults = buildDefaultLayouts(sampleWidgets);
    const dirty = {
      lg: [
        { i: "a", x: 1, y: 0, w: 4, h: 8 },
        { i: "a", x: 9, y: 9, w: 2, h: 2 },
        { i: "ghost", x: 0, y: 0, w: 3, h: 3 },
        { i: "b", x: 4, y: 0, w: 4, h: 4 },
      ],
      md: defaults.md,
      sm: defaults.sm,
      xs: defaults.xs,
    };
    const clean = sanitizeLayouts(dirty, defaults)!;
    expect(clean.lg?.map((i) => i.i)).toEqual(["a", "b"]);
    expect(clean.lg?.find((i) => i.i === "a")).toMatchObject({ x: 1, w: 4 });
    expect(clean.lg?.some((i) => i.i === "ghost")).toBe(false);
  });

  it("tracks board-specific layoutRevision and exposes recommended updates only for older v3 envelopes", () => {
    const defaults = buildDefaultLayouts(sampleWidgets);
    saveLayouts("rev", defaults, { layoutRevision: 1, preset: "compact" });

    const stale = loadLayoutState("rev", sampleWidgets, {
      layoutRevision: 3,
      preset: "compact",
    });
    expect(stale.hasRecommendedUpdate).toBe(true);
    expect(stale.storedRevision).toBe(1);

    const next = applyRecommendedLayouts("rev", sampleWidgets, {
      layoutRevision: 3,
      preset: "compact",
    });
    expect(next.lg?.map((i) => i.i)).toEqual(["a", "b"]);

    const fresh = loadLayoutState("rev", sampleWidgets, {
      layoutRevision: 3,
      preset: "compact",
    });
    expect(fresh.hasRecommendedUpdate).toBe(false);
    expect(fresh.storedRevision).toBe(3);
    expect(fresh.source).toBe("v3");
  });

  it("clearLayouts removes v1/v2/v3 keys for the board", () => {
    storage.setItem(layoutStorageKey("wipe", 1), "{}");
    storage.setItem(layoutStorageKey("wipe", 2), "{}");
    saveLayouts("wipe", buildDefaultLayouts(sampleWidgets), { layoutRevision: 1 });
    clearLayouts("wipe");
    expect(storage.getItem(layoutStorageKey("wipe", 1))).toBeNull();
    expect(storage.getItem(layoutStorageKey("wipe", 2))).toBeNull();
    expect(storage.getItem(layoutStorageKey("wipe", 3))).toBeNull();
  });

  it("reset-via-clear then load returns defaults at the current revision", () => {
    const custom = buildDefaultLayouts(sampleWidgets);
    custom.lg = custom.lg!.map((item) => (item.i === "a" ? { ...item, x: 5 } : item));
    saveLayouts("reset", custom, { layoutRevision: 1 });
    clearLayouts("reset");

    const state = loadLayoutState("reset", sampleWidgets, { layoutRevision: 2 });
    expect(state.source).toBe("defaults");
    expect(state.layouts.lg?.find((i) => i.i === "a")?.x).toBe(0);
    expect(state.hasRecommendedUpdate).toBe(false);
  });

  it("saveLayouts preserves omitted breakpoints from the existing save", () => {
    const full = buildDefaultLayouts(sampleWidgets);
    full.md = full.md!.map((item) => (item.i === "a" ? { ...item, x: 2, w: 5 } : item));
    saveLayouts("partial", full, { layoutRevision: 1 });

    saveLayouts(
      "partial",
      {
        lg: full.lg!.map((item) => (item.i === "a" ? { ...item, x: 4 } : item)),
      },
      { layoutRevision: 1 }
    );

    const loaded = loadLayouts("partial", sampleWidgets, { layoutRevision: 1 });
    expect(loaded.lg?.find((i) => i.i === "a")).toMatchObject({ x: 4 });
    expect(loaded.md?.find((i) => i.i === "a")).toMatchObject({ x: 2, w: 5 });
    expect(loaded.sm?.length).toBe(2);
    expect(loaded.xs?.length).toBe(2);
  });

  it("revisionForDragSave never keeps revision 0", () => {
    expect(revisionForDragSave(0, 1)).toBe(1);
    expect(revisionForDragSave(0, 3)).toBe(3);
    expect(revisionForDragSave(-1, 2)).toBe(2);
    expect(revisionForDragSave(2, 5)).toBe(2);
  });

  it("drag-style save after v1 migration persists a non-zero revision", () => {
    const legacy = buildDefaultLayouts(sampleWidgets);
    storage.setItem(layoutStorageKey("drag-rev", 1), JSON.stringify(legacy));

    const state = loadLayoutState("drag-rev", sampleWidgets, { layoutRevision: 1 });
    expect(state.storedRevision).toBe(1);

    const moved = {
      lg: state.layouts.lg!.map((item) => (item.i === "a" ? { ...item, x: 3 } : item)),
    };
    const revision = revisionForDragSave(state.storedRevision, 1);
    saveLayouts("drag-rev", moved, { layoutRevision: revision });

    const envelope = JSON.parse(storage.getItem(layoutStorageKey("drag-rev", 3))!) as {
      layoutRevision: number;
      layouts: { lg: { i: string; x: number }[]; md: unknown };
    };
    expect(envelope.layoutRevision).toBe(1);
    expect(envelope.layouts.lg.find((i) => i.i === "a")?.x).toBe(3);
    // md preserved despite partial drag payload
    expect(Array.isArray(envelope.layouts.md)).toBe(true);
  });
});

describe("widget board row height compatibility", () => {
  it("keeps Research on legacy physical row height until the tab opts in", () => {
    expect(resolveBoardRowHeight("research")).toBe(36);
    expect(resolveBoardRowHeight("research", undefined)).toBe(36);
    expect(resolveBoardRowHeight("research", 28)).toBe(28);
  });

  it("uses compact default for other boards when rowHeight is omitted", () => {
    expect(resolveBoardRowHeight("mortgage")).toBe(DEFAULT_WIDGET_ROW_HEIGHT);
    expect(resolveBoardRowHeight("upfront", 30)).toBe(30);
  });
});

describe("widget body overflow safety", () => {
  it("keeps desktop fixed-height bodies on overflow auto even when scrollBody is false", () => {
    expect(resolveWidgetBodyOverflow(false)).toBe("auto");
    expect(resolveWidgetBodyOverflow(false, false)).toBe("auto");
    expect(resolveWidgetBodyOverflow(false, true)).toBe("auto");
  });

  it("keeps natural stacks visible by default and allows opt-in scrolling", () => {
    expect(resolveWidgetBodyOverflow(true)).toBe("visible");
    expect(resolveWidgetBodyOverflow(true, false)).toBe("visible");
    expect(resolveWidgetBodyOverflow(true, true)).toBe("auto");
  });
});
