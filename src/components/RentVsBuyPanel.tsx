import { InputAdornment, Stack, Typography } from "@mui/material";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import type { AppPersisted, RentVsBuyAssumptionsPersisted } from "../storage/mortgageState";
import { computeRentVsBuy } from "../lib/rentVsBuyMath";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatNumberField(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return String(value);
}

function formatPercentField(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function patchRentVsBuy(
  current: RentVsBuyAssumptionsPersisted | undefined,
  partial: Partial<RentVsBuyAssumptionsPersisted>
): RentVsBuyAssumptionsPersisted | undefined {
  const merged = { ...current, ...partial };
  const hasAny =
    merged.comparableRentMonthly !== undefined ||
    merged.investmentReturnPercent !== undefined ||
    merged.horizonYears !== undefined;
  return hasAny ? merged : undefined;
}

export type RentVsBuyPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

/** Rent-vs-buy decision tool (Exit tab) — persists assumptions only. */
export function RentVsBuyPanel({ state, patch }: RentVsBuyPanelProps) {
  const assumptions = state.rentVsBuy;
  const hasInputs = state.homePrice > 0 || state.monthlyRent > 0;

  const result = useMemo(
    () => (hasInputs ? computeRentVsBuy(state, assumptions) : null),
    [state, assumptions, hasInputs]
  );

  const populated =
    hasInputs &&
    (assumptions?.comparableRentMonthly !== undefined ||
      assumptions?.investmentReturnPercent !== undefined ||
      assumptions?.horizonYears !== undefined ||
      state.monthlyRent > 0);

  return (
    <Stack spacing={0.85}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        Compare holding this rental vs renting elsewhere and investing the same upfront cash. Uses
        monthly projection for the buy path — results are not saved.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Comparable rent"
          size="small"
          fullWidth
          helperText="What you'd pay to rent instead"
          value={formatNumberField(
            assumptions?.comparableRentMonthly ?? (state.monthlyRent > 0 ? state.monthlyRent : undefined)
          )}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(n)) return;
            patch({
              rentVsBuy: patchRentVsBuy(assumptions, {
                comparableRentMonthly: Math.max(0, Math.round(n)),
              }),
            });
          }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">/mo</InputAdornment>,
            },
          }}
        />
        <TextField
          label="Invest return"
          size="small"
          fullWidth
          helperText="If you rent & invest cash"
          value={formatPercentField(assumptions?.investmentReturnPercent ?? 5)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(n)) return;
            patch({
              rentVsBuy: patchRentVsBuy(assumptions, {
                investmentReturnPercent: Math.min(30, Math.max(0, n)),
              }),
            });
          }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%/yr</InputAdornment> },
          }}
        />
        <TextField
          label="Horizon"
          size="small"
          fullWidth
          helperText="Comparison years (1–30)"
          value={formatNumberField(assumptions?.horizonYears ?? 7)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(n)) return;
            patch({
              rentVsBuy: patchRentVsBuy(assumptions, {
                horizonYears: Math.min(30, Math.max(1, Math.round(n))),
              }),
            });
          }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">yr</InputAdornment> },
          }}
        />
      </Stack>

      {!hasInputs ? (
        <Typography variant="caption" color="text.disabled">
          Add purchase price or rent to run the rent-vs-buy comparison.
        </Typography>
      ) : null}

      {populated && result ? (
        <Stack spacing={0.75}>
          <Alert
            severity={result.advantageBuy >= 0 ? "success" : "info"}
            variant="outlined"
            sx={{ py: 0.35, borderRadius: 1.5 }}
          >
            After {result.horizonYears} yr: buy net{" "}
            <strong>{money.format(result.buyNetWealth)}</strong> vs rent/invest{" "}
            <strong>{money.format(result.rentNetWealth)}</strong>
            {result.advantageBuy !== 0 ? (
              <>
                {" "}
                · advantage{" "}
                <strong>
                  {result.advantageBuy >= 0 ? "+" : "−"}
                  {money.format(Math.abs(result.advantageBuy))}
                </strong>{" "}
                to {result.advantageBuy >= 0 ? "buy" : "rent"}
              </>
            ) : null}
          </Alert>
          {result.breakEvenYear != null ? (
            <Typography variant="caption" color="text.secondary">
              Break-even around year {result.breakEvenYear} (buy wealth exceeds rent/invest path).
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Buy does not overtake rent/invest within {result.horizonYears} years at these assumptions.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Buy path: {money.format(result.buyCumulativeCashFlow)} cumulative CF +{" "}
            {money.format(result.buyEndingEquity)} equity · same {money.format(result.initialCashInvested)}{" "}
            upfront on both paths
          </Typography>
        </Stack>
      ) : hasInputs ? (
        <Typography variant="caption" color="text.disabled">
          Adjust assumptions above to compare buy vs rent paths.
        </Typography>
      ) : null}
    </Stack>
  );
}
