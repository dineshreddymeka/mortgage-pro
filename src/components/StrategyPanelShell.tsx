import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export type StrategyPanelShellProps = {
  title: string;
  description?: ReactNode;
  emptyHint: string;
  populated: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
};

/** Reusable strategy panel with distinct empty vs populated states. */
export function StrategyPanelShell({
  title,
  description,
  emptyHint,
  populated,
  headerExtra,
  children,
}: StrategyPanelShellProps) {
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: populated ? "divider" : "action.disabledBackground",
        bgcolor: "transparent",
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        gap={0.75}
        sx={{ px: 1.25, py: 0.85, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            {title}
          </Typography>
          {description ? <Box sx={{ mt: 0.25 }}>{description}</Box> : null}
        </Box>
        {headerExtra ?? null}
      </Stack>
      <Box sx={{ px: 1.25, py: 1 }}>
        {!populated ? (
          <Typography variant="caption" color="text.disabled" sx={{ display: "block", lineHeight: 1.4 }}>
            {emptyHint}
          </Typography>
        ) : null}
        {children}
      </Box>
    </Box>
  );
}

export function formatUsd(value: number, precise = false): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: precise ? 2 : 0,
    maximumFractionDigits: precise ? 2 : 0,
  }).format(value);
}

export function parseUsdInput(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parsePercentInput(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}
