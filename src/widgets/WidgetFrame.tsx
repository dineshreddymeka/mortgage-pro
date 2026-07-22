import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

export type WidgetFrameProps = {
  title: string;
  description?: string;
  children: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

/** Chrome around a grid item: drag handle + title (+ optional collapse). */
export function WidgetFrame({
  title,
  description,
  children,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
}: WidgetFrameProps) {
  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#f7fafc", 0.96) : alpha("#101a24", 0.96),
        boxShadow: "var(--pp-shadow)",
        // Do not clip the grid item's resize handles (siblings of this frame).
        overflow: "visible",
        position: "relative",
        pb: collapsed ? 0 : "2px",
        pr: collapsed ? 0 : "2px",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        className="widget-drag-handle"
        sx={{
          cursor: "grab",
          px: 1,
          py: 0.55,
          borderBottom: collapsed ? "none" : "1px solid",
          borderColor: "divider",
          bgcolor: (t) =>
            t.palette.mode === "light" ? alpha("#0b1f33", 0.03) : alpha("#e8eef4", 0.04),
          "&:active": { cursor: "grabbing" },
          userSelect: "none",
          borderRadius: collapsed ? "12px" : "12px 12px 0 0",
          minHeight: 36,
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.75 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.78rem",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
            noWrap
          >
            {title}
          </Typography>
          {description && !collapsed ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.62rem", display: { xs: "none", sm: "block" } }}
              noWrap
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        {collapsible ? (
          <Tooltip title={collapsed ? `Expand ${title}` : `Collapse ${title}`}>
            <IconButton
              size="small"
              className="widget-collapse-toggle"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              aria-expanded={!collapsed}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                color: "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px",
                width: 28,
                height: 28,
              }}
            >
              {collapsed ? (
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandLessIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        ) : (
          <Typography
            sx={{
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
              opacity: 0.7,
            }}
          >
            Drag
          </Typography>
        )}
      </Stack>
      {!collapsed ? (
        <>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              px: 1.1,
              py: 0.9,
              borderRadius: "0 0 12px 12px",
            }}
          >
            {children}
          </Box>
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
        </>
      ) : null}
    </Box>
  );
}
