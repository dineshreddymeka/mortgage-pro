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
  buildDefaultLayouts,
  clearLayouts,
  loadLayouts,
  saveLayouts,
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

export function WidgetBoard({ boardId, widgets, rowHeight = 36 }: WidgetBoardProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const defs = useMemo(() => widgets.map(({ content: _c, ...def }) => def), [widgets]);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => loadLayouts(boardId, defs));

  const onLayoutChange = useCallback(
    (_current: Layout, all: ResponsiveLayouts) => {
      setLayouts(all);
      saveLayouts(boardId, all);
    },
    [boardId]
  );

  const resetLayout = useCallback(() => {
    clearLayouts(boardId);
    setLayouts(buildDefaultLayouts(defs));
  }, [boardId, defs]);

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
          Widgets · drag title bar · resize corner
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
          "& .react-grid-item.react-grid-placeholder": {
            bgcolor: (t) => t.palette.secondary.main,
            opacity: 0.18,
            borderRadius: "12px",
          },
          "& .react-grid-item > .react-resizable-handle::after": {
            borderColor: "rgba(14, 116, 144, 0.55) !important",
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
              bounded: false,
              threshold: 3,
            }}
            resizeConfig={{
              enabled: true,
              handles: ["se"],
            }}
            onLayoutChange={onLayoutChange}
          >
            {widgets.map((w) => (
              <div key={w.id}>
                <WidgetFrame title={w.title} description={w.description}>
                  {w.content}
                </WidgetFrame>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : (
          <Box sx={{ minHeight: 120 }} />
        )}
      </Box>
    </Box>
  );
}
