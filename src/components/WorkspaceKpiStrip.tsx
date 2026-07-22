import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { HouseComparisonRow } from "../lib/houseComparison";

const money0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct1 = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

export type WorkspaceKpiStripProps = {
  houseLabel: string;
  row: HouseComparisonRow;
  rateApr: number;
  termYears: number;
};

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "good" | "bad";
}) {
  const color =
    tone === "accent"
      ? "secondary.main"
      : tone === "good"
        ? "success.main"
        : tone === "bad"
          ? "error.main"
          : "text.primary";

  return (
    <Box
      className="pp-metric-pop"
      sx={{
        minWidth: { xs: 92, sm: 110 },
        px: 1,
        py: 0.55,
        borderRadius: "10px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#ffffff", 0.72) : alpha("#162433", 0.72),
      }}
    >
      <Typography
        sx={{
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "text.secondary",
          mb: 0.15,
        }}
      >
        {label}
      </Typography>
      <Typography
        className="pp-mono"
        sx={{
          fontSize: { xs: "0.86rem", sm: "0.95rem" },
          fontWeight: 650,
          letterSpacing: "-0.03em",
          color,
          lineHeight: 1.15,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function WorkspaceKpiStrip({ houseLabel, row, rateApr, termYears }: WorkspaceKpiStripProps) {
  const cf = row.cashFlowMonthly;
  const coc = row.cashOnCash;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      useFlexGap
      flexWrap="wrap"
      alignItems="stretch"
      className="pp-rise"
      sx={{ mb: 1 }}
    >
      <Box sx={{ mr: 0.25, alignSelf: "center", minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Live model
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          {houseLabel}
        </Typography>
      </Box>

      <Kpi label="Price" value={money0.format(row.homePrice)} />
      <Kpi label="Payment" value={`${money0.format(row.paymentMonthly)}/mo`} tone="accent" />
      <Kpi label="Cash in" value={money0.format(row.cashInvested)} />
      <Kpi
        label="Cash flow"
        value={`${money0.format(cf)}/mo`}
        tone={cf > 0 ? "good" : cf < 0 ? "bad" : "default"}
      />
      <Kpi
        label="Cash-on-cash"
        value={pct1.format(coc)}
        tone={coc > 0 ? "good" : coc < 0 ? "bad" : "default"}
      />
      <Kpi label="Loan" value={`${rateApr}% · ${termYears}y`} />
    </Stack>
  );
}
