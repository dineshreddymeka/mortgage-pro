import { InputAdornment, Stack, Typography } from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import type { AppPersisted, StressTestDeltasPersisted } from "../storage/mortgageState";
import { computeStressTestComparison } from "../lib/stressTestMath";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct1 = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatDeltaField(value: number | undefined): string {
  if (value === undefined || value === 0 || !Number.isFinite(value)) return "";
  return String(Math.round(value * 10) / 10);
}

function patchStressDeltas(
  current: StressTestDeltasPersisted | undefined,
  partial: Partial<StressTestDeltasPersisted>
): StressTestDeltasPersisted | undefined {
  const merged: StressTestDeltasPersisted = { ...current };
  for (const [k, v] of Object.entries(partial) as [keyof StressTestDeltasPersisted, number][]) {
    if (v === 0 || v === undefined || !Number.isFinite(v)) delete merged[k];
    else merged[k] = v;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function parseDeltaInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "+") return undefined;
  const n = Number(trimmed.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function formatDscr(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}×`;
}

type DeltaField = {
  key: keyof StressTestDeltasPersisted;
  label: string;
  helper: string;
  suffix: string;
};

const DELTA_FIELDS: DeltaField[] = [
  { key: "rateDeltaPct", label: "Rate", helper: "Add to APR", suffix: "pts" },
  { key: "rentDeltaPct", label: "Rent", helper: "% change", suffix: "%" },
  { key: "vacancyDeltaPct", label: "Vacancy", helper: "Add points", suffix: "pts" },
  { key: "appreciationDeltaPct", label: "Appreciation", helper: "Add to exit %", suffix: "pts" },
  { key: "expenseDeltaPct", label: "OpEx", helper: "% on mgmt/maint/capex", suffix: "%" },
  { key: "homePriceDeltaPct", label: "Price", helper: "% on purchase", suffix: "%" },
];

export type StressTestPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

/** Stress test by applying deltas to scenario copies through deriveScenario. */
export function StressTestPanel({ state, patch }: StressTestPanelProps) {
  const deltas = state.stressTestDeltas;
  const hasBaseline = state.homePrice > 0;

  const comparison = useMemo(
    () => (hasBaseline ? computeStressTestComparison(state, deltas) : null),
    [state, deltas, hasBaseline]
  );

  const hasDeltas = deltas != null && Object.values(deltas).some((v) => v !== 0);

  return (
    <Stack spacing={0.85}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        Apply what-if deltas to a scenario copy and compare metrics via <code>deriveScenario</code>.
        Only deltas are saved — stressed results are computed on read.
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ "& > *": { flex: { xs: "1 1 100%", sm: "1 1 calc(33% - 8px)" }, minWidth: 120 } }}
      >
        {DELTA_FIELDS.map(({ key, label, helper, suffix }) => (
          <TextField
            key={key}
            label={label}
            size="small"
            helperText={helper}
            disabled={!hasBaseline}
            value={formatDeltaField(deltas?.[key])}
            onChange={(e) => {
              const n = parseDeltaInput(e.target.value);
              patch({
                stressTestDeltas: patchStressDeltas(deltas, {
                  [key]: n === undefined ? 0 : n,
                }),
              });
            }}
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> },
            }}
          />
        ))}
      </Stack>

      {!hasBaseline ? (
        <Typography variant="caption" color="text.disabled">
          Add a purchase price to stress-test financing and rental metrics.
        </Typography>
      ) : null}

      {hasBaseline && comparison && hasDeltas ? (
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell align="right">Baseline</TableCell>
                <TableCell align="right">Stressed</TableCell>
                <TableCell align="right">Δ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(
                [
                  ["Payment / mo", "paymentMonthly", money.format],
                  ["Cash flow / mo", "cashFlowMonthly", money.format],
                  ["Cash-on-cash", "cashOnCash", (v: number) => `${pct1.format(v * 100)}%`],
                  ["DSCR", "dscr", (v: number | null) => formatDscr(v)],
                  ["NOI / yr", "noiAnnual", money.format],
                  ["Cap rate", "capRate", (v: number) => `${pct1.format(v * 100)}%`],
                ] as const
              ).map(([label, key, fmt]) => {
                const baseVal = comparison.baseline[key];
                const stressVal = comparison.stressed[key];
                const delta =
                  typeof baseVal === "number" && typeof stressVal === "number"
                    ? stressVal - baseVal
                    : null;
                return (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell align="right">
                      {typeof baseVal === "number" ? fmt(baseVal as never) : fmt(baseVal as never)}
                    </TableCell>
                    <TableCell align="right">
                      {typeof stressVal === "number" || stressVal === null
                        ? fmt(stressVal as never)
                        : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {delta != null && key !== "dscr"
                        ? (key === "cashOnCash" || key === "capRate"
                            ? `${delta >= 0 ? "+" : ""}${pct1.format(delta * 100)}%`
                            : `${delta >= 0 ? "+" : ""}${money.format(delta)}`)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : hasBaseline ? (
        <Typography variant="caption" color="text.disabled">
          Enter one or more deltas above to see baseline vs stressed metrics.
        </Typography>
      ) : null}
    </Stack>
  );
}
