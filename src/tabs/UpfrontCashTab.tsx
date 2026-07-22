import Grid from "@mui/material/Grid2";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { UpfrontCashScenarioPanel } from "../components/UpfrontCashScenarioPanel";
import { UpfrontCreditsPanel } from "../components/UpfrontCreditsPanel";
import { deriveScenario } from "../lib/deriveScenario";
import { estimateLocationCosts } from "../lib/locationCostEstimator";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type UpfrontCashTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: "var(--pp-font-display)",
          fontWeight: 800,
          fontSize: { xs: "1.05rem", sm: "1.2rem" },
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export function UpfrontCashTab({ state, patch }: UpfrontCashTabProps) {
  const derived = useMemo(() => deriveScenario(state), [state]);
  const loanAmount = derived.loanAmount;
  const cashToClose = derived.netCashToClose;
  const locationEst = estimateLocationCosts(state.propertyState, state.propertyPostalCode);

  const widgets = useMemo(
    () => [
      {
        id: "settlement",
        title: "Cash at settlement",
        description: "Down + closing + misc · syncs Mortgage & Rental",
        defaultLayout: { x: 0, y: 0, w: 12, h: 7, minW: 4, minH: 5 },
        content: (
          <Stack spacing={1}>
            <Typography
              className="pp-mono"
              sx={{
                fontWeight: 800,
                fontSize: "1.35rem",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {moneyDec.format(cashToClose)}
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <SummaryStat label="Down" value={money.format(state.downPayment)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <SummaryStat
                  label="Closing + misc"
                  value={money.format(state.closingCosts + state.miscInitialCash)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <SummaryStat label="Financed" value={money.format(loanAmount)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <SummaryStat label="Total due" value={moneyDec.format(cashToClose)} />
              </Grid>
            </Grid>
          </Stack>
        ),
      },
      {
        id: "credits",
        title: "Credits & rehab",
        description: "Earnest · seller · lender · rehab",
        defaultLayout: { x: 0, y: 7, w: 12, h: 9, minW: 4, minH: 6 },
        content: <UpfrontCreditsPanel state={state} patch={patch} />,
      },
      {
        id: "inputs-model",
        title: "Inputs & modeled costs",
        description: "Edit left · compare model on the right",
        defaultLayout: { x: 0, y: 16, w: 12, h: 18, minW: 6, minH: 10 },
        content: (
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 5 }}>
              <Grid container spacing={1}>
                <Grid size={12}>
                  <TextField
                    label="Purchase price"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.homePrice)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      const hp = Math.max(0, n);
                      patch({
                        homePrice: hp,
                        downPayment: Math.round((hp * state.downPaymentPercent) / 100),
                        propertyTaxAnnual: Math.round((hp * state.propertyTaxPercent) / 100),
                      });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Down payment"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.downPayment)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      const hp = state.homePrice;
                      const dp = Math.max(0, n);
                      const capped = hp > 0 ? Math.min(dp, hp) : dp;
                      patch({
                        downPayment: capped,
                        downPaymentPercent: hp > 0 ? (capped / hp) * 100 : 0,
                      });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Down %"
                    size="small"
                    fullWidth
                    value={formatPercentField(state.downPaymentPercent)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      const pct = Math.min(100, Math.max(0, n));
                      const hp = state.homePrice;
                      patch({
                        downPaymentPercent: pct,
                        downPayment: hp > 0 ? Math.round((hp * pct) / 100) : state.downPayment,
                      });
                    }}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Closing costs"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.closingCosts)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (Number.isFinite(n)) patch({ closingCosts: Math.max(0, n) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Misc. one-time"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.miscInitialCash)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (Number.isFinite(n)) patch({ miscInitialCash: Math.max(0, n) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <UpfrontCashScenarioPanel
                state={state}
                patch={patch}
                loanAmount={loanAmount}
                cashToClose={cashToClose}
                closingCostMultiplier={locationEst.closingCostMultiplier}
                hideEditHint
              />
            </Grid>
          </Grid>
        ),
      },
    ],
    [cashToClose, loanAmount, locationEst.closingCostMultiplier, patch, state]
  );

  return <WidgetBoard boardId="upfront" widgets={widgets} rowHeight={28} />;
}
