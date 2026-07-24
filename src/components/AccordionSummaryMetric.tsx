import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { minOperationalFontPx } from "../layout/formLayout";

/**
 * Bold numeric readout for collapsed accordion headers (stays visible before expand).
 */
export function AccordionSummaryMetric({ label, value }: { label: string; value: string }) {
  const muted = value === "—";
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0, flex: "0 1 auto" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: `${minOperationalFontPx}px`,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Typography
        component="span"
        sx={(t) => ({
          display: "block",
          fontWeight: muted ? 600 : 700,
          fontVariantNumeric: "tabular-nums",
          fontSize: { xs: "0.82rem", sm: "0.95rem" },
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: muted
            ? t.palette.text.secondary
            : t.palette.mode === "light"
              ? t.palette.primary.dark
              : t.palette.primary.light,
        })}
      >
        {value}
      </Typography>
    </Stack>
  );
}
