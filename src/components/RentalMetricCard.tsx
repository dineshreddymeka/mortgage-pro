import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { minOperationalFontPx } from "../layout/formLayout";

const opFont = `${minOperationalFontPx}px`;

export function MetricNoDataPlaceholder(props: { hint?: string; compact?: boolean }) {
  return (
    <Typography
      variant="body2"
      color="text.disabled"
      sx={{
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        fontSize: props.compact ? "0.875rem" : "0.9375rem",
        letterSpacing: "-0.02em",
      }}
    >
      {props.hint ?? "—"}
    </Typography>
  );
}

export type RentalMetricCardProps = {
  label: string;
  value: string | null;
  detail?: string;
  detailExtra?: string;
  hint: string;
  positive?: boolean;
  title?: string;
  note?: ReactNode;
  noDataHint?: string;
};

/** Metric tile with responsive no-data placeholder (shared across Rental and Compare). */
export function RentalMetricCard(props: RentalMetricCardProps) {
  const hasRight = Boolean(props.detail || props.detailExtra);
  const hasValue = props.value != null && props.value !== "";

  return (
    <Box
      title={props.title}
      sx={{
        height: "100%",
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        px: 1,
        py: 0.75,
        bgcolor: "transparent",
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: "secondary.main" },
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: opFont,
          lineHeight: 1.2,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {props.label}
      </Typography>
      <Stack
        direction="row"
        alignItems={hasRight ? "flex-start" : "baseline"}
        justifyContent="space-between"
        gap={0.5}
        sx={{ mt: 0.125 }}
      >
        {hasValue ? (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              fontSize: "0.9375rem",
              letterSpacing: "-0.02em",
              fontFamily: "var(--pp-font-display)",
              color:
                props.positive === undefined
                  ? "text.primary"
                  : props.positive
                    ? "success.main"
                    : "error.main",
            }}
          >
            {props.value}
          </Typography>
        ) : (
          <MetricNoDataPlaceholder hint={props.noDataHint} />
        )}
        {hasRight ? (
          <Stack alignItems="flex-end" spacing={0.125} sx={{ minWidth: 0, textAlign: "right" }}>
            {props.detail ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums", fontSize: opFont, lineHeight: 1.2 }}
              >
                {props.detail}
              </Typography>
            ) : null}
            {props.detailExtra ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontVariantNumeric: "tabular-nums",
                  fontSize: opFont,
                  lineHeight: 1.2,
                  opacity: 0.92,
                }}
              >
                {props.detailExtra}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: opFont, lineHeight: 1.25, display: "block", mt: 0.25 }}
      >
        {props.hint}
      </Typography>
      {props.note ? (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.45,
            fontSize: opFont,
            lineHeight: 1.35,
            color: "success.main",
          }}
        >
          {props.note}
        </Typography>
      ) : null}
    </Box>
  );
}

const pct1 = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ratio2 = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDscrDisplay(dscr: number | null | undefined): string | null {
  if (dscr == null || !Number.isFinite(dscr)) return null;
  return `${ratio2.format(dscr)}×`;
}

export function formatGrmDisplay(grm: number | null | undefined): string | null {
  if (grm == null || !Number.isFinite(grm)) return null;
  return ratio2.format(grm);
}

export function formatOnePercentRuleDisplay(ratio: number | null | undefined): string | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  return `${pct1.format(ratio * 100)}%`;
}
