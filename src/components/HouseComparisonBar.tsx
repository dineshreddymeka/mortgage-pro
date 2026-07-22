import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
  bestHouseIdForMetric,
  type ComparisonMetricKey,
  type HouseComparisonRow,
} from "../lib/houseComparison";

const money0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct1 = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const METRICS: { key: ComparisonMetricKey; label: string; format: (n: number) => string }[] = [
  { key: "homePrice", label: "Price", format: (n) => money0.format(n) },
  { key: "paymentMonthly", label: "Pmt / mo", format: (n) => money0.format(n) },
  { key: "cashInvested", label: "Cash in", format: (n) => money0.format(n) },
  { key: "rentMonthly", label: "Rent / mo", format: (n) => money0.format(n) },
  { key: "cashFlowMonthly", label: "CF / mo", format: (n) => money0.format(n) },
  { key: "cashOnCash", label: "Cash-on-cash", format: (n) => pct1.format(n) },
];

export type HouseComparisonBarProps = {
  rows: HouseComparisonRow[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
};

export function HouseComparisonBar({ rows, activePropertyId, onSelect }: HouseComparisonBarProps) {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => a.houseNumber - b.houseNumber);
  const bestByMetric = Object.fromEntries(
    METRICS.map((m) => [m.key, bestHouseIdForMetric(sorted, m.key)])
  ) as Record<ComparisonMetricKey, string | null>;

  return (
    <Box
      component="aside"
      aria-label="House comparison"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#ffffff", 0.96) : alpha("#1c1c1e", 0.96),
        position: "sticky",
        bottom: 0,
        zIndex: 15,
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 1, sm: 1.5 }, py: 0.75 }}>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5, px: 0.25 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Compare
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
            Tap a house column to open it · green = better
          </Typography>
        </Stack>

        <Box
          sx={{
            overflowX: "auto",
            scrollbarWidth: "thin",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "10px",
          }}
        >
          <Box
            component="table"
            sx={{
              width: "100%",
              minWidth: 520,
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
                    px: 1,
                    py: 0.55,
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: "text.secondary",
                    position: "sticky",
                    left: 0,
                    bgcolor: (t) =>
                      t.palette.mode === "light" ? "#fafafa" : "#2c2c2e",
                    zIndex: 1,
                    minWidth: 88,
                  }}
                >
                  Metric
                </Box>
                {sorted.map((row) => {
                  const active = row.id === activePropertyId;
                  return (
                    <Box
                      component="th"
                      key={row.id}
                      onClick={() => onSelect(row.id)}
                      sx={{
                        textAlign: "right",
                        px: 1,
                        py: 0.55,
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: active ? "secondary.main" : "text.primary",
                        bgcolor: active
                          ? (t) => alpha(t.palette.secondary.main, 0.08)
                          : "transparent",
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        minWidth: 96,
                        "&:hover": {
                          bgcolor: (t) => alpha(t.palette.secondary.main, 0.1),
                        },
                      }}
                    >
                      {row.label}
                      {active ? (
                        <Typography
                          component="span"
                          sx={{ display: "block", fontSize: "0.6rem", fontWeight: 600 }}
                        >
                          Active
                        </Typography>
                      ) : null}
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
                      px: 1,
                      py: 0.45,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "text.secondary",
                      position: "sticky",
                      left: 0,
                      bgcolor: (t) =>
                        t.palette.mode === "light" ? "#ffffff" : "#1c1c1e",
                      zIndex: 1,
                    }}
                  >
                    {metric.label}
                  </Box>
                  {sorted.map((row) => {
                    const active = row.id === activePropertyId;
                    const best = bestByMetric[metric.key] === row.id;
                    const value = row[metric.key];
                    return (
                      <Box
                        component="td"
                        key={`${row.id}-${metric.key}`}
                        onClick={() => onSelect(row.id)}
                        sx={{
                          textAlign: "right",
                          px: 1,
                          py: 0.45,
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          fontWeight: best || active ? 700 : 500,
                          letterSpacing: "-0.02em",
                          color: best ? "success.main" : "text.primary",
                          bgcolor: active
                            ? (t) => alpha(t.palette.secondary.main, 0.05)
                            : "transparent",
                          borderLeft: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {metric.format(value)}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
