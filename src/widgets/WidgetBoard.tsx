import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  applyCollapsedHeights,
  buildDefaultLayouts,
  clearLayouts,
  COLLAPSED_WIDGET_H,
  loadCollapsedIds,
  loadExpandedHeights,
  loadLayouts,
  saveCollapsedIds,
  saveExpandedHeights,
  saveLayouts,
  type ExpandedHeights,
  type WidgetDef,
} from "./widgetLayout";
import { WidgetFrame } from "./WidgetFrame";

export type WidgetBoardItem = WidgetDef & {
  content: ReactNode;
};

export type WidgetBoardProps = {
  boardId: string;
  widgets: WidgetBoardItem[];
  rowHeight?: number;
};

type BreakpointKey = "lg" | "md" | "sm" | "xs";
const BPS: BreakpointKey[] = ["lg", "md", "sm", "xs"];

function snapshotHeights(layouts: ResponsiveLayouts, id: string): ExpandedHeights[string] {
  const out: ExpandedHeights[string] = {};
  for (const bp of BPS) {
    const item = layouts[bp]?.find((l) => l.i === id);
    if (item && item.h > COLLAPSED_WIDGET_H) out[bp] = item.h;
  }
  return out;
}

function restoreHeights(
  layouts: ResponsiveLayouts,
  id: string,
  saved: ExpandedHeights[string] | undefined,
  fallbackH: number,
  fallbackMinH: number
): ResponsiveLayouts {
  const next: ResponsiveLayouts = { ...layouts };
  for (const bp of BPS) {
    const list = next[bp];
    if (!list) continue;
    next[bp] = list.map((item) => {
      if (item.i !== id) return item;
      const h = saved?.[bp] ?? Math.max(fallbackH, COLLAPSED_WIDGET_H + 2);
      return { ...item, h, minH: fallbackMinH };
    });
  }
  return next;
}

export function WidgetBoard({ boardId, widgets, rowHeight = 36 }: WidgetBoardProps) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const defs = useMemo(() => widgets.map(({ content: _c, ...def }) => def), [widgets]);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    const loaded = loadLayouts(boardId, defs);
    return applyCollapsedHeights(loaded, loadCollapsedIds(boardId));
  });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => loadCollapsedIds(boardId));
  const [expandedHeights, setExpandedHeights] = useState<ExpandedHeights>(() =>
    loadExpandedHeights(boardId)
  );

  const onLayoutChange = useCallback(
    (_current: Layout, all: ResponsiveLayouts) => {
      // While collapsed, keep header-only height even if drag/compact nudges items.
      const next = applyCollapsedHeights(all, collapsedIds);
      setLayouts(next);
      saveLayouts(boardId, next);
    },
    [boardId, collapsedIds]
  );

  const resetLayout = useCallback(() => {
    clearLayouts(boardId);
    setCollapsedIds(new Set());
    setExpandedHeights({});
    setLayouts(buildDefaultLayouts(defs));
  }, [boardId, defs]);

  const toggleCollapse = useCallback(
    (id: string) => {
      const def = defs.find((d) => d.id === id);
      if (!def?.collapsible) return;

      const collapsing = !collapsedIds.has(id);
      const nextCollapsed = new Set(collapsedIds);
      const fallback = def.defaultLayout.h ?? 8;

      if (collapsing) {
        const snap = snapshotHeights(layouts, id);
        const nextHeights = { ...expandedHeights, [id]: { ...expandedHeights[id], ...snap } };
        nextCollapsed.add(id);
        const updated = applyCollapsedHeights(layouts, nextCollapsed);
        setExpandedHeights(nextHeights);
        setCollapsedIds(nextCollapsed);
        setLayouts(updated);
        saveExpandedHeights(boardId, nextHeights);
        saveCollapsedIds(boardId, nextCollapsed);
        saveLayouts(boardId, updated);
        return;
      }

      nextCollapsed.delete(id);
      const fallbackMinH = def.defaultLayout.minH ?? 2;
      const updated = applyCollapsedHeights(
        restoreHeights(layouts, id, expandedHeights[id], fallback, fallbackMinH),
        nextCollapsed
      );
      setCollapsedIds(nextCollapsed);
      setLayouts(updated);
      saveCollapsedIds(boardId, nextCollapsed);
      saveLayouts(boardId, updated);
    },
    [boardId, collapsedIds, defs, expandedHeights, layouts]
  );

  return (
    <Box ref={containerRef} sx={{ width: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 0.75 }}
      >
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Widgets · drag title · collapse · resize corner
        </Typography>
        <Button
          size="small"
          variant="text"
          startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
          onClick={resetLayout}
          sx={{ minHeight: 26, fontSize: "0.72rem" }}
        >
          Reset layout
        </Button>
      </Stack>

      <Box
        sx={{
          "& .react-grid-item": {
            overflow: "visible",
          },
          "& .react-grid-item.react-grid-placeholder": {
            bgcolor: (t) => t.palette.secondary.main,
            opacity: 0.18,
            borderRadius: "12px",
          },
          "& .react-grid-item > .react-resizable-handle": {
            opacity: "1 !important",
            zIndex: 6,
            width: 28,
            height: 28,
            pointerEvents: "auto",
          },
          "& .react-grid-item > .react-resizable-handle-se": {
            bottom: 2,
            right: 2,
            cursor: "se-resize",
            borderRadius: "6px",
            bgcolor: (t) =>
              t.palette.mode === "light" ? "rgba(14, 116, 144, 0.12)" : "rgba(94, 234, 212, 0.16)",
            "&:hover": {
              bgcolor: (t) =>
                t.palette.mode === "light" ? "rgba(14, 116, 144, 0.22)" : "rgba(94, 234, 212, 0.28)",
            },
          },
          "& .react-grid-item > .react-resizable-handle-se::after": {
            content: '""',
            position: "absolute",
            right: 6,
            bottom: 6,
            width: 10,
            height: 10,
            borderRight: "2px solid rgba(14, 116, 144, 0.85)",
            borderBottom: "2px solid rgba(14, 116, 144, 0.85)",
          },
          "& .react-grid-item > .react-resizable-handle-e": {
            width: 12,
            height: "40%",
            top: "30%",
            right: 0,
            marginTop: 0,
            cursor: "ew-resize",
            opacity: "0.35 !important",
            "&:hover": { opacity: "0.9 !important" },
          },
          "& .react-grid-item > .react-resizable-handle-s": {
            height: 12,
            width: "40%",
            left: "30%",
            bottom: 0,
            marginLeft: 0,
            cursor: "ns-resize",
            opacity: "0.35 !important",
            "&:hover": { opacity: "0.9 !important" },
          },
          "& .react-grid-item > .react-resizable-handle-e::after, & .react-grid-item > .react-resizable-handle-s::after":
            {
              display: "none",
            },
        }}
      >
        {mounted && width > 0 ? (
          <ResponsiveGridLayout
            className="pp-widget-grid"
            width={width}
            layouts={layouts}
            breakpoints={{ lg: 1100, md: 800, sm: 560, xs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
            rowHeight={rowHeight}
            margin={[10, 10]}
            containerPadding={[0, 0]}
            dragConfig={{
              enabled: true,
              handle: ".widget-drag-handle",
              cancel:
                ".react-resizable-handle,.widget-collapse-toggle,input,textarea,button,a,select,[role='button']",
              bounded: false,
              threshold: 3,
            }}
            resizeConfig={{
              enabled: true,
              handles: ["se", "e", "s"],
            }}
            onLayoutChange={onLayoutChange}
          >
            {widgets.map((w) => {
              const collapsed = collapsedIds.has(w.id);
              return (
                <div
                  key={w.id}
                  style={{
                    height: "100%",
                    width: "100%",
                    overflow: "visible",
                  }}
                >
                  <WidgetFrame
                    title={w.title}
                    description={w.description}
                    collapsible={Boolean(w.collapsible)}
                    collapsed={collapsed}
                    onToggleCollapse={() => toggleCollapse(w.id)}
                  >
                    {w.content}
                  </WidgetFrame>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        ) : (
          <Box sx={{ minHeight: 120 }} />
        )}
      </Box>
    </Box>
  );
}
