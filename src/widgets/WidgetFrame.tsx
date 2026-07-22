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
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#f7fafc", 0.96) : alpha("#101a24", 0.96),
        boxShadow: "var(--pp-shadow)",
        overflow: "hidden",
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
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
