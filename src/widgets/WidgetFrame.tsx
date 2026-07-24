import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useId, type ReactNode } from "react";
import { resolveWidgetBodyOverflow } from "./widgetFrameLayout";

export type WidgetFrameProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Natural-height stack: no drag/resize chrome. */
  mobileStack?: boolean;
  /**
   * Desktop: hide frame-body overflow so a height-aware child table/list owns scrolling.
   * Natural mobile stacks stay visible regardless (no nested frame scroll).
   * When unset/false on desktop, the frame keeps overflow:auto as a safe default.
   */
  scrollBody?: boolean;
  /** When false, hide drag affordances (coarse pointer / non-interactive). */
  dragEnabled?: boolean;
};

/** Chrome around a grid item: optional drag handle + title. */
export function WidgetFrame({
  title,
  description,
  children,
  mobileStack = false,
  scrollBody,
  dragEnabled = true,
}: WidgetFrameProps) {
  const showDrag = !mobileStack && dragEnabled;
  const titleId = useId();
  const bodyOverflow = resolveWidgetBodyOverflow(mobileStack, scrollBody);

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{
        height: mobileStack ? "auto" : "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        bgcolor: "background.paper",
        boxShadow: "var(--pp-shadow)",
        overflow: "hidden",
        position: "relative",
        pb: showDrag ? "2px" : 0,
        pr: showDrag ? "2px" : 0,
        transition: "box-shadow 0.2s var(--pp-ease), border-color 0.2s ease",
        "&:hover": {
          borderColor: (t) => alpha(t.palette.primary.main, 0.28),
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        className={showDrag ? "widget-drag-handle" : undefined}
        // Decorative drag cue only — not a focusable control; avoid aria-label noise.
        title={showDrag ? "Drag title bar to rearrange" : undefined}
        sx={{
          cursor: showDrag ? "grab" : "default",
          px: 1.1,
          py: 0.6,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (t) =>
            t.palette.mode === "light" ? alpha("#006AFF", 0.03) : alpha("#4D9AFF", 0.06),
          "&:active": showDrag ? { cursor: "grabbing" } : undefined,
          userSelect: "none",
          minHeight: showDrag ? 36 : 32,
        }}
      >
        {showDrag ? (
          <DragIndicatorIcon
            aria-hidden
            sx={{ fontSize: 16, color: "text.secondary", opacity: 0.75 }}
          />
        ) : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            id={titleId}
            component="h3"
            sx={{
              fontFamily: "var(--pp-font-display)",
              fontWeight: 700,
              fontSize: "0.875rem",
              letterSpacing: "-0.015em",
              lineHeight: 1.2,
            }}
            noWrap
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.75rem", display: { xs: "none", sm: "block" } }}
              noWrap
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        {showDrag ? (
          <Typography
            aria-hidden
            component="span"
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
              opacity: 0.7,
            }}
          >
            Drag
          </Typography>
        ) : null}
      </Stack>
      <Box
        sx={{
          flex: mobileStack && bodyOverflow === "visible" ? "none" : 1,
          minHeight: 0,
          overflow: bodyOverflow,
          px: { xs: 0.85, sm: 0.95 },
          py: { xs: 0.6, sm: 0.65 },
          borderRadius: "0 0 12px 12px",
        }}
      >
        {children}
      </Box>
      {showDrag ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            right: 4,
            bottom: 4,
            width: 14,
            height: 14,
            pointerEvents: "none",
            opacity: 0.45,
            background:
              "linear-gradient(135deg, transparent 45%, currentColor 46%, currentColor 54%, transparent 55%), linear-gradient(135deg, transparent 65%, currentColor 66%, currentColor 74%, transparent 75%)",
            color: "secondary.main",
          }}
        />
      ) : null}
    </Box>
  );
}
