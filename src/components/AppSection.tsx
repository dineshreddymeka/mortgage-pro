import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type AppSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional right-side meta (metrics, actions). */
  aside?: ReactNode;
  className?: string;
};

/** Compact section: title + optional support line + content. */
export function AppSection({ title, description, children, aside, className }: AppSectionProps) {
  return (
    <Box
      component="section"
      className={className}
      sx={{
        py: 1.25,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="baseline"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: "1.02rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            {title}
            {description ? (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1, fontWeight: 500, display: { xs: "none", sm: "inline" } }}
              >
                — {description}
              </Typography>
            ) : null}
          </Typography>
        </Box>
        {aside ? <Box sx={{ flexShrink: 0 }}>{aside}</Box> : null}
      </Stack>
      {children}
    </Box>
  );
}
