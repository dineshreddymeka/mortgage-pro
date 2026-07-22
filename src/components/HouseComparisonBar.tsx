import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
  bestHouseIdForMetric,
  comparisonMetricValue,
  type ComparisonMetricKey,
  type HouseComparisonRow,
} from "../lib/houseComparison";
import {
  formatDscrDisplay,
  formatGrmDisplay,
  formatOnePercentRuleDisplay,
} from "./RentalMetricCard";

const money0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct1 = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const METRICS: {
  key: ComparisonMetricKey;
  label: string;
  format: (row: HouseComparisonRow) => string;
}[] = [
  { key: "homePrice", label: "Price", format: (r) => money0.format(r.homePrice) },
  { key: "paymentMonthly", label: "Payment", format: (r) => `${money0.format(r.paymentMonthly)}/mo` },
  { key: "cashInvested", label: "Cash in", format: (r) => money0.format(r.cashInvested) },
  { key: "rentMonthly", label: "Rent", format: (r) => `${money0.format(r.rentMonthly)}/mo` },
  { key: "cashFlowMonthly", label: "Cash flow", format: (r) => `${money0.format(r.cashFlowMonthly)}/mo` },
  { key: "cashOnCash", label: "CoC", format: (r) => pct1.format(r.cashOnCash) },
  {
    key: "dscr",
    label: "DSCR",
    format: (r) => formatDscrDisplay(r.dscr) ?? "—",
  },
  {
    key: "grossRentMultiplier",
    label: "GRM",
    format: (r) => formatGrmDisplay(r.grossRentMultiplier) ?? "—",
  },
  {
    key: "onePercentRuleRatio",
    label: "1% rule",
    format: (r) => formatOnePercentRuleDisplay(r.onePercentRuleRatio) ?? "—",
  },
];

export type HouseComparisonPanelProps = {
  rows: HouseComparisonRow[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
};

/** @deprecated Use HouseComparisonPanel — compare lives on the Compare tab. */
export type HouseComparisonBarProps = HouseComparisonPanelProps;

function scoreHouse(row: HouseComparisonRow, bestByMetric: Record<ComparisonMetricKey, string | null>) {
  return METRICS.reduce((n, m) => n + (bestByMetric[m.key] === row.id ? 1 : 0), 0);
}

/** Side-by-side house metrics for the Compare tab (active houses only). */
export function HouseComparisonPanel({
  rows,
  activePropertyId,
  onSelect,
}: HouseComparisonPanelProps) {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => a.houseNumber - b.houseNumber);
  const bestByMetric = Object.fromEntries(
    METRICS.map((m) => [m.key, bestHouseIdForMetric(sorted, m.key)])
  ) as Record<ComparisonMetricKey, string | null>;

  const leaderId =
    sorted.length > 1
      ? [...sorted].sort((a, b) => scoreHouse(b, bestByMetric) - scoreHouse(a, bestByMetric))[0]?.id
      : null;

  return (
    <Box component="section" aria-label="House comparison" className="pp-fade-in" sx={{ pt: 0.25 }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1, px: 0.25 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "0.68rem",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Smart compare
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
          Best cells in teal · leader scored across metrics · tap a column to open that house
        </Typography>
      </Stack>

      <Box
        sx={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "12px",
          boxShadow: "var(--pp-shadow)",
        }}
      >
        <Box
          component="table"
          sx={{
            width: "100%",
            minWidth: { xs: 420, sm: 560 },
            borderCollapse: "collapse",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Box component="thead">
            <Box component="tr">
              <Box
                component="th"
                sx={{
                  textAlign: "left",
                  px: 1.1,
                  py: 0.85,
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  position: "sticky",
                  left: 0,
                  bgcolor: (t) => (t.palette.mode === "light" ? "#eef3f7" : "#162433"),
                  zIndex: 1,
                  minWidth: 92,
                }}
              >
                Signal
              </Box>
              {sorted.map((row) => {
                const active = row.id === activePropertyId;
                const leader = row.id === leaderId;
                return (
                  <Box
                    component="th"
                    key={row.id}
                    onClick={() => onSelect(row.id)}
                    sx={{
                      textAlign: "right",
                      px: 1.1,
                      py: 0.85,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      color: active || leader ? "secondary.main" : "text.primary",
                      bgcolor: active
                        ? (t) => alpha(t.palette.secondary.main, 0.1)
                        : "transparent",
                      borderLeft: "1px solid",
                      borderColor: "divider",
                      minWidth: { xs: 88, sm: 104 },
                      "&:hover": {
                        bgcolor: (t) => alpha(t.palette.secondary.main, 0.12),
                      },
                    }}
                  >
                    {row.label}
                    <Typography
                      component="span"
                      className="pp-mono"
                      sx={{
                        display: "block",
                        fontSize: "0.6rem",
                        fontWeight: 650,
                        color: leader ? "success.main" : "text.secondary",
                      }}
                    >
                      {leader ? "Leader" : active ? "Active" : `${scoreHouse(row, bestByMetric)} best`}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Box component="tbody">
            {METRICS.map((metric) => (
              <Box
                component="tr"
                key={metric.key}
                sx={{
                  "&:not(:last-of-type) td": {
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  },
                }}
              >
                <Box
                  component="td"
                  sx={{
                    textAlign: "left",
                    px: 1.1,
                    py: 0.7,
                    fontSize: "0.7rem",
                    fontWeight: 650,
                    color: "text.secondary",
                    position: "sticky",
                    left: 0,
                    bgcolor: (t) => (t.palette.mode === "light" ? "#f7fafc" : "#101a24"),
                    zIndex: 1,
                  }}
                >
                  {metric.label}
                </Box>
                {sorted.map((row) => {
                  const active = row.id === activePropertyId;
                  const best = bestByMetric[metric.key] === row.id;
                  const raw = comparisonMetricValue(row, metric.key);
                  return (
                    <Box
                      component="td"
                      key={`${row.id}-${metric.key}`}
                      onClick={() => onSelect(row.id)}
                      sx={{
                        textAlign: "right",
                        px: 1.1,
                        py: 0.7,
                        cursor: "pointer",
                        fontFamily: "var(--pp-font-mono)",
                        fontSize: "0.78rem",
                        fontWeight: best || active ? 700 : 500,
                        letterSpacing: "-0.03em",
                        color: best ? "success.main" : raw == null ? "text.disabled" : "text.primary",
                        bgcolor: best
                          ? (t) => alpha(t.palette.success.main, 0.08)
                          : active
                            ? (t) => alpha(t.palette.secondary.main, 0.04)
                            : "transparent",
                        borderLeft: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {metric.format(row)}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** @deprecated Prefer HouseComparisonPanel / Compare tab. */
export const HouseComparisonBar = HouseComparisonPanel;
