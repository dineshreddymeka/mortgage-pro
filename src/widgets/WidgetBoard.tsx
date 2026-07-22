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
  const theme = useTheme();
  /** Phones: stack naturally (no fixed RGL heights / drag). */
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const defs = useMemo(
    () =>
      widgets.map(({ id, title, description, defaultLayout }) => ({
        id,
        title,
        description,
        defaultLayout,
      })),
    [widgets]
  );
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

  if (isPhone) {
    return (
      <Box sx={{ width: "100%" }}>
        <Stack spacing={1.1}>
          {widgets.map((w) => (
            <WidgetFrame key={w.id} title={w.title} description={w.description} mobileStack>
              {w.content}
            </WidgetFrame>
          ))}
        </Stack>
      </Box>
    );
  }

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
          Widgets · drag title · resize corner
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
              cancel: ".react-resizable-handle,input,textarea,button,a,select,[role='button']",
              bounded: false,
              threshold: 3,
            }}
            resizeConfig={{
              enabled: true,
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
                  overflow: "visible",
                }}
              >
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
