import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
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
  applyRecommendedLayouts,
  buildDefaultLayouts,
  clearLayouts,
  loadLayoutState,
  resolveBoardRowHeight,
  revisionForDragSave,
  saveLayouts,
  type WidgetDef,
} from "./widgetLayout";
import { WidgetFrame } from "./WidgetFrame";

/** Stack to natural height at / below the md grid breakpoint (800px). */
export const WIDGET_STACK_MAX_WIDTH_PX = 800;

/** Operational chrome text — keep at least 12px for readability. */
const OPERATIONAL_FONT_SIZE = "0.75rem";

export type WidgetBoardItem = WidgetDef & {
  content: ReactNode;
};

export type WidgetBoardProps = {
  boardId: string;
  widgets: WidgetBoardItem[];
  /**
   * Grid row height in px. When omitted, Research keeps legacy 36 until that tab
   * migrates; other boards use the compact default (28).
   */
  rowHeight?: number;
  /**
   * Board-specific layout preset revision. Bump when recommended defaults change.
   * Existing custom layouts are kept; users can opt into the new preset.
   */
  layoutRevision?: number;
  /** Optional preset id stored with the layout envelope. */
  preset?: string;
};

export function WidgetBoard({
  boardId,
  widgets,
  rowHeight: rowHeightProp,
  layoutRevision = 1,
  preset,
}: WidgetBoardProps) {
  const theme = useTheme();
  const rowHeight = resolveBoardRowHeight(boardId, rowHeightProp);
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  const viewportNarrow = useMediaQuery(`(max-width:${WIDGET_STACK_MAX_WIDTH_PX - 0.05}px)`);
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });

  const persistOptions = useMemo(
    () => ({ layoutRevision, preset }),
    [layoutRevision, preset]
  );

  const defs = useMemo(
    () =>
      widgets.map(({ id, title, description, defaultLayout, defaultLayouts, scrollBody }) => ({
        id,
        title,
        description,
        defaultLayout,
        defaultLayouts,
        scrollBody,
      })),
    [widgets]
  );

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(
    () => loadLayoutState(boardId, defs, persistOptions).layouts
  );
  const [storedRevision, setStoredRevision] = useState(
    () => loadLayoutState(boardId, defs, persistOptions).storedRevision
  );
  const [hasRecommendedUpdate, setHasRecommendedUpdate] = useState(
    () => loadLayoutState(boardId, defs, persistOptions).hasRecommendedUpdate
  );

  // Prefer measured container width; fall back to viewport until mounted.
  const isNarrow =
    mounted && width > 0 ? width < WIDGET_STACK_MAX_WIDTH_PX : viewportNarrow;
  const useNaturalStack = isNarrow;
  const dragResizeEnabled = !useNaturalStack && !isCoarsePointer;

  const onLayoutChange = useCallback(
    (_current: Layout, all: ResponsiveLayouts) => {
      if (!dragResizeEnabled) return;
      setLayouts(all);
      const revision = revisionForDragSave(storedRevision, layoutRevision);
      saveLayouts(boardId, all, { layoutRevision: revision, preset });
      if (revision !== storedRevision) setStoredRevision(revision);
    },
    [boardId, dragResizeEnabled, layoutRevision, preset, storedRevision]
  );

  const resetLayout = useCallback(() => {
    clearLayouts(boardId);
    const next = buildDefaultLayouts(defs);
    setLayouts(next);
    saveLayouts(boardId, next, persistOptions);
    setStoredRevision(layoutRevision);
    setHasRecommendedUpdate(false);
  }, [boardId, defs, layoutRevision, persistOptions]);

  const useRecommendedLayout = useCallback(() => {
    const next = applyRecommendedLayouts(boardId, defs, persistOptions);
    setLayouts(next);
    setStoredRevision(layoutRevision);
    setHasRecommendedUpdate(false);
  }, [boardId, defs, layoutRevision, persistOptions]);

  const toolbar = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ mb: 0.75 }}
      flexWrap="wrap"
      useFlexGap
    >
      <Typography
        aria-live="polite"
        sx={{
          fontSize: OPERATIONAL_FONT_SIZE,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {useNaturalStack
          ? "Widgets · stacked"
          : dragResizeEnabled
            ? "Widgets · drag title · resize corner"
            : "Widgets · touch layout locked"}
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant={hasRecommendedUpdate ? "outlined" : "text"}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
          onClick={useRecommendedLayout}
          aria-label={
            hasRecommendedUpdate
              ? "Use recommended layout (updated preset available)"
              : "Use recommended layout"
          }
          sx={{ minHeight: 36, minWidth: 44, fontSize: OPERATIONAL_FONT_SIZE }}
        >
          Use recommended layout
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
          onClick={resetLayout}
          sx={{ minHeight: 36, minWidth: 44, fontSize: OPERATIONAL_FONT_SIZE }}
        >
          Reset layout
        </Button>
      </Stack>
    </Stack>
  );

  // Stable DOM order: always follow the widgets definition order (not layout y/x).
  const stackedWidgets = (
    <Stack spacing={1.1} component="div">
      {widgets.map((w) => (
        <WidgetFrame
          key={w.id}
          title={w.title}
          description={w.description}
          mobileStack
          scrollBody={w.scrollBody}
          dragEnabled={false}
        >
          {w.content}
        </WidgetFrame>
      ))}
    </Stack>
  );

  return (
    <Box
      ref={containerRef}
      sx={{ width: "100%" }}
      role="region"
      aria-label="Widget board"
    >
      {toolbar}

      {useNaturalStack ? (
        stackedWidgets
      ) : (
        <Box
          sx={{
            "& .react-grid-item": {
              overflow: "hidden",
            },
            "& .react-grid-item.react-grid-placeholder": {
              bgcolor: (t) => t.palette.secondary.main,
              opacity: 0.18,
              borderRadius: "12px",
            },
            "& .react-grid-item > .react-resizable-handle": {
              opacity: dragResizeEnabled ? "1 !important" : "0 !important",
              zIndex: 6,
              width: 28,
              height: 28,
              pointerEvents: dragResizeEnabled ? "auto" : "none",
            },
            "& .react-grid-item > .react-resizable-handle-se": {
              bottom: 2,
              right: 2,
              cursor: "se-resize",
              borderRadius: "6px",
              bgcolor: (t) =>
                t.palette.mode === "light"
                  ? "rgba(14, 116, 144, 0.12)"
                  : "rgba(94, 234, 212, 0.16)",
              "&:hover": {
                bgcolor: (t) =>
                  t.palette.mode === "light"
                    ? "rgba(14, 116, 144, 0.22)"
                    : "rgba(94, 234, 212, 0.28)",
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
              opacity: dragResizeEnabled ? "0.35 !important" : "0 !important",
              "&:hover": { opacity: dragResizeEnabled ? "0.9 !important" : "0 !important" },
            },
            "& .react-grid-item > .react-resizable-handle-s": {
              height: 12,
              width: "40%",
              left: "30%",
              bottom: 0,
              marginLeft: 0,
              cursor: "ns-resize",
              opacity: dragResizeEnabled ? "0.35 !important" : "0 !important",
              "&:hover": { opacity: dragResizeEnabled ? "0.9 !important" : "0 !important" },
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
              breakpoints={{
                lg: 1100,
                md: WIDGET_STACK_MAX_WIDTH_PX,
                sm: theme.breakpoints.values.sm,
                xs: 0,
              }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
              rowHeight={rowHeight}
              margin={[10, 10]}
              containerPadding={[0, 0]}
              dragConfig={{
                enabled: dragResizeEnabled,
                handle: ".widget-drag-handle",
                cancel: ".react-resizable-handle,input,textarea,button,a,select,[role='button']",
                bounded: false,
                threshold: 3,
              }}
              resizeConfig={{
                enabled: dragResizeEnabled,
                handles: ["se", "e", "s"],
              }}
              onLayoutChange={onLayoutChange}
            >
              {widgets.map((w) => (
                <div
                  key={w.id}
                  style={{
                    height: "100%",
                    width: "100%",
                    overflow: "hidden",
                  }}
                >
                  <WidgetFrame
                    title={w.title}
                    description={w.description}
                    scrollBody={w.scrollBody}
                    dragEnabled={dragResizeEnabled}
                  >
                    {w.content}
                  </WidgetFrame>
                </div>
              ))}
            </ResponsiveGridLayout>
          ) : (
            <Box sx={{ minHeight: 120 }} aria-hidden />
          )}
        </Box>
      )}
    </Box>
  );
}
