import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

export type WidgetFrameProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Chrome around a grid item: drag handle + title. */
export function WidgetFrame({ title, description, children }: WidgetFrameProps) {
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
        // Leave room so the SE resize grip isn't covered by content chrome.
        pb: "2px",
        pr: "2px",
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
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (t) =>
            t.palette.mode === "light" ? alpha("#0b1f33", 0.03) : alpha("#e8eef4", 0.04),
          "&:active": { cursor: "grabbing" },
          userSelect: "none",
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
          {description ? (
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
      </Stack>
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
    </Box>
  );
}
