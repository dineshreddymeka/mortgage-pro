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
        flex: "0 0 auto",
        minWidth: { xs: 72, sm: 96 },
        px: { xs: 0.7, sm: 0.9 },
        py: 0.35,
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#ffffff", 0.72) : alpha("#162433", 0.72),
      }}
    >
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "text.secondary",
          lineHeight: 1.1,
          mb: 0.1,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Typography
        className="pp-mono"
        sx={{
          fontSize: { xs: "0.8rem", sm: "0.88rem" },
          fontWeight: 650,
          letterSpacing: "-0.03em",
          color,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** One-line, horizontally scrollable live KPI rail for the active house. */
export function WorkspaceKpiStrip({ houseLabel, row, rateApr, termYears }: WorkspaceKpiStripProps) {
  const cf = row.cashFlowMonthly;
  const coc = row.cashOnCash;

  return (
    <Stack
      direction="row"
      spacing={0.55}
      alignItems="center"
      className="pp-rise"
      sx={{
        mb: 0.85,
        flexWrap: "nowrap",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
        pb: 0.15,
        mx: { xs: -0.25, sm: 0 },
        px: { xs: 0.25, sm: 0 },
      }}
    >
      <Box sx={{ flex: "0 0 auto", minWidth: 0, pr: 0.35, maxWidth: { xs: 120, sm: 160 } }}>
        <Typography
          sx={{
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
            lineHeight: 1.1,
          }}
        >
          Live model
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: "0.82rem", sm: "0.9rem" },
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
          noWrap
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
