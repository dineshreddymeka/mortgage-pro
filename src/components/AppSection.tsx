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

/** Compact section for dense / side-by-side dashboard content. */
export function AppSection({ title, description, children, aside, className }: AppSectionProps) {
  return (
    <Box
      component="section"
      className={className}
      sx={{
        py: 0.85,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0.75 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "-0.015em",
              lineHeight: 1.25,
              color: "text.primary",
            }}
          >
            {title}
            {description ? (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{
                  ml: 0.75,
                  fontWeight: 400,
                  fontSize: "0.72rem",
                  display: { xs: "none", sm: "inline" },
                }}
              >
                {description}
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
