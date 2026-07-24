import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Fragment } from "react";
import {
  minOperationalFontPx,
} from "../layout/formLayout";
import {
  comparisonMetricValue,
  type ComparisonMetricKey,
  type HouseComparisonRow,
} from "../lib/houseComparison";
import {
  COMPARE_METRIC_GROUP_LABELS,
  bestHouseIdsForMetric,
  leaderHouseIds,
  scoreHouseBestCount,
  type CompareMetricDef,
  type CompareMetricGroupId,
} from "../tabs/compareMetrics";
import { shellActionTargetSx } from "./workspaceShell";
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

const opFont = `${minOperationalFontPx}px`;

/** Sticky offset under thead so group labels pin below house headers while scrolling. */
const COMPARE_GROUP_STICKY_TOP_PX = 64;

const METRICS: CompareMetricDef[] = [
  {
    key: "homePrice",
    label: "Price",
    group: "acquisition",
    format: (r) => money0.format(r.homePrice),
  },
  {
    key: "paymentMonthly",
    label: "Payment",
    group: "acquisition",
    format: (r) => `${money0.format(r.paymentMonthly)}/mo`,
  },
  {
    key: "cashInvested",
    label: "Cash in",
    group: "acquisition",
    format: (r) => money0.format(r.cashInvested),
  },
  {
    key: "rentMonthly",
    label: "Rent",
    group: "operations",
    format: (r) => `${money0.format(r.rentMonthly)}/mo`,
  },
  {
    key: "cashFlowMonthly",
    label: "Cash flow",
    group: "operations",
    format: (r) => `${money0.format(r.cashFlowMonthly)}/mo`,
  },
  {
    key: "cashOnCash",
    label: "CoC",
    group: "operations",
    format: (r) => pct1.format(r.cashOnCash),
  },
  {
    key: "dscr",
    label: "DSCR",
    group: "investor",
    format: (r) => formatDscrDisplay(r.dscr) ?? "—",
  },
  {
    key: "grossRentMultiplier",
    label: "GRM",
    group: "investor",
    format: (r) => formatGrmDisplay(r.grossRentMultiplier) ?? "—",
  },
  {
    key: "onePercentRuleRatio",
    label: "1% rule",
    group: "investor",
    format: (r) => formatOnePercentRuleDisplay(r.onePercentRuleRatio) ?? "—",
  },
  {
    key: "afterTaxCashFlowAnnual",
    label: "AT CF/yr",
    group: "investor",
    format: (r) =>
      r.afterTaxCashFlowAnnual != null ? `${money0.format(r.afterTaxCashFlowAnnual)}/yr` : "—",
  },
  {
    key: "afterTaxRealWealthYear5",
    label: "AT gain Y5",
    group: "investor",
    format: (r) =>
      r.afterTaxRealWealthYear5 != null ? money0.format(r.afterTaxRealWealthYear5) : "—",
  },
];

const GROUP_ORDER: CompareMetricGroupId[] = ["acquisition", "operations", "investor"];

export type HouseComparisonPanelProps = {
  rows: HouseComparisonRow[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
};

/** @deprecated Use HouseComparisonPanel — compare lives on the Compare tab. */
export type HouseComparisonBarProps = HouseComparisonPanelProps;

/** Opaque sticky backgrounds (no translucent overlays over scrolled cells). */
const stickyMetricBg = (mode: "light" | "dark", kind: "head" | "body" | "group" | "active") => {
  if (mode === "light") {
    if (kind === "active") return "#d7eaf0";
    if (kind === "head") return "#eef3f7";
    if (kind === "group") return "#e8eef4";
    return "#f7fafc";
  }
  if (kind === "active") return "#1a3340";
  if (kind === "head") return "#162433";
  if (kind === "group") return "#13202c";
  return "#101a24";
};

/** Side-by-side house metrics for the Compare tab (active houses only). */
export function HouseComparisonPanel({
  rows,
  activePropertyId,
  onSelect,
}: HouseComparisonPanelProps) {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => a.houseNumber - b.houseNumber);
  const bestByMetric = Object.fromEntries(
    METRICS.map((m) => [m.key, bestHouseIdsForMetric(sorted, m.key)])
  ) as Record<ComparisonMetricKey, string[]>;

  const leaders = leaderHouseIds(sorted, bestByMetric);
  const uniqueLeader = leaders.length === 1 ? leaders[0]! : null;
  const tiedLeaders = leaders.length > 1;

  const colCount = sorted.length + 1;

  return (
    <Box component="section" aria-label="House comparison" className="pp-fade-in" sx={{ pt: 0.25 }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1, px: 0.25 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: opFont,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Smart compare
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: opFont }}>
          Best marked with ★ (ties share ★) · Active underlined · Open a house from its header
          button
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
          maxHeight: { xs: "70dvh", md: "calc(100dvh - 220px)" },
          overflowY: "auto",
        }}
      >
        <Box
          component="table"
          sx={{
            width: "100%",
            minWidth: { xs: 420, sm: 560 },
            borderCollapse: "separate",
            borderSpacing: 0,
            fontVariantNumeric: "tabular-nums",
            fontSize: opFont,
          }}
        >
          <Box component="thead">
            <Box component="tr">
              <Box
                component="th"
                scope="col"
                sx={{
                  textAlign: "left",
                  px: 1,
                  py: 0.65,
                  fontSize: opFont,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  bgcolor: (t) => stickyMetricBg(t.palette.mode, "head"),
                  minWidth: 88,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                Metric
              </Box>
              {sorted.map((row) => {
                const active = row.id === activePropertyId;
                const leader = row.id === uniqueLeader;
                const tiedLead = tiedLeaders && leaders.includes(row.id);
                const bestCount = scoreHouseBestCount(row, bestByMetric);
                return (
                  <Box
                    component="th"
                    scope="col"
                    key={row.id}
                    sx={{
                      textAlign: "right",
                      px: 0.75,
                      py: 0.55,
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      bgcolor: (t) =>
                        stickyMetricBg(t.palette.mode, active ? "active" : "head"),
                      borderBottom: "1px solid",
                      borderLeft: "1px solid",
                      borderColor: "divider",
                      minWidth: { xs: 88, sm: 104 },
                      boxShadow: active
                        ? (t) => `inset 0 -2px 0 ${t.palette.secondary.main}`
                        : undefined,
                    }}
                  >
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => onSelect(row.id)}
                      aria-label={`Open ${row.label}`}
                      aria-current={active ? "true" : undefined}
                      sx={{
                        ...shellActionTargetSx,
                        display: "block",
                        width: "100%",
                        minWidth: 0,
                        px: 0.35,
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: opFont,
                        letterSpacing: "-0.03em",
                        color: "text.primary",
                        textDecoration: active ? "underline" : "none",
                        textUnderlineOffset: 3,
                        borderRadius: "6px",
                        "&:hover": {
                          bgcolor: (t) => alpha(t.palette.secondary.main, 0.1),
                        },
                      }}
                    >
                      {row.label}
                    </Button>
                    <Typography
                      component="span"
                      className="pp-mono"
                      sx={{
                        display: "block",
                        fontSize: opFont,
                        fontWeight: 650,
                        color: "text.secondary",
                        pr: 0.35,
                        lineHeight: 1.2,
                      }}
                    >
                      {leader
                        ? "Leader"
                        : tiedLead
                          ? "Tied lead"
                          : active
                            ? "Active"
                            : `${bestCount} best`}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Box component="tbody">
            {GROUP_ORDER.map((groupId) => {
              const groupMetrics = METRICS.filter((m) => m.group === groupId);
              if (groupMetrics.length === 0) return null;
              return (
                <Fragment key={groupId}>
                  <Box component="tr">
                    <Box
                      component="th"
                      scope="colgroup"
                      colSpan={colCount}
                      sx={{
                        textAlign: "left",
                        px: 1,
                        py: 0.4,
                        fontSize: opFont,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "text.secondary",
                        position: "sticky",
                        top: COMPARE_GROUP_STICKY_TOP_PX,
                        zIndex: 1,
                        bgcolor: (t) => stickyMetricBg(t.palette.mode, "group"),
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {COMPARE_METRIC_GROUP_LABELS[groupId]}
                    </Box>
                  </Box>
                  {groupMetrics.map((metric) => (
                    <Box
                      component="tr"
                      key={metric.key}
                      sx={{
                        "& td, & th": {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        },
                      }}
                    >
                      <Box
                        component="th"
                        scope="row"
                        sx={{
                          textAlign: "left",
                          px: 1,
                          py: 0.55,
                          fontSize: opFont,
                          fontWeight: 650,
                          color: "text.secondary",
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                          bgcolor: (t) => stickyMetricBg(t.palette.mode, "body"),
                          minWidth: 88,
                        }}
                      >
                        {metric.label}
                      </Box>
                      {sorted.map((row) => {
                        const active = row.id === activePropertyId;
                        const bestIds = bestByMetric[metric.key] ?? [];
                        const best = bestIds.includes(row.id);
                        const tiedBest = best && bestIds.length > 1;
                        const raw = comparisonMetricValue(row, metric.key);
                        return (
                          <Box
                            component="td"
                            key={`${row.id}-${metric.key}`}
                            aria-label={
                              best
                                ? `${metric.label} for ${row.label}: ${metric.format(row)}${
                                    tiedBest ? " (tied best)" : " (best)"
                                  }`
                                : undefined
                            }
                            sx={{
                              textAlign: "right",
                              px: 1,
                              py: 0.55,
                              fontFamily: "var(--pp-font-mono)",
                              fontSize: opFont,
                              fontWeight: best || active ? 700 : 500,
                              letterSpacing: "-0.03em",
                              color: raw == null ? "text.disabled" : "text.primary",
                              bgcolor: (t) =>
                                best
                                  ? alpha(t.palette.success.main, 0.08)
                                  : active
                                    ? alpha(t.palette.secondary.main, 0.04)
                                    : "transparent",
                              borderLeft: "1px solid",
                              borderColor: "divider",
                              // Non-color cues: bold + ★ for best; underline for active column.
                              textDecoration: active ? "underline" : "none",
                              textUnderlineOffset: 2,
                              boxShadow: best
                                ? (t) => `inset 0 -2px 0 ${t.palette.success.main}`
                                : undefined,
                            }}
                          >
                            {metric.format(row)}
                            {best ? (
                              <Typography
                                component="span"
                                aria-hidden
                                sx={{
                                  ml: 0.35,
                                  fontSize: opFont,
                                  fontWeight: 800,
                                  color: "success.main",
                                }}
                              >
                                ★{tiedBest ? "=" : ""}
                              </Typography>
                            ) : null}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Fragment>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** @deprecated Prefer HouseComparisonPanel / Compare tab. */
export const HouseComparisonBar = HouseComparisonPanel;
