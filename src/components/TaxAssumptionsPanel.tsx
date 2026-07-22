import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import type { ReactNode } from "react";
import type { DerivedTaxExitSnapshot, DerivedTaxMetrics } from "../lib/deriveTaxMetrics";
import type {
  AppPersisted,
  Tax1031AssumptionsPersisted,
  TaxAssumptionsPersisted,
} from "../storage/mortgageState";

const money0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value));
}

function patchTax(
  current: TaxAssumptionsPersisted | undefined,
  partial: Partial<Omit<TaxAssumptionsPersisted, "enabled">>
): TaxAssumptionsPersisted {
  return { enabled: true, ...current, ...partial };
}

function patchTax1031(
  current: Tax1031AssumptionsPersisted | undefined,
  partial: Partial<Tax1031AssumptionsPersisted>
): Tax1031AssumptionsPersisted | undefined {
  const replacement =
    partial.replacementPropertyCost !== undefined
      ? Math.max(0, Math.round(partial.replacementPropertyCost))
      : current?.replacementPropertyCost;
  const boot =
    partial.bootReceived !== undefined
      ? Math.max(0, Math.round(partial.bootReceived))
      : current?.bootReceived;
  if ((replacement ?? 0) <= 0 && (boot ?? 0) <= 0) return undefined;
  return {
    ...(replacement && replacement > 0 ? { replacementPropertyCost: replacement } : {}),
    ...(boot && boot > 0 ? { bootReceived: boot } : {}),
  };
}

export type TaxAssumptionsPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  derivedTax: DerivedTaxMetrics | null;
  /** Rental = operating focus; exit = sale / 1031 focus. */
  variant: "rental" | "exit";
};

function TaxDisclaimer() {
  return (
    <Alert severity="info" variant="outlined" sx={{ py: 0.35, "& .MuiAlert-message": { width: "100%" } }}>
      <Typography variant="caption" sx={{ lineHeight: 1.35, display: "block" }}>
        Simplified estimates only — not tax advice. Ignores passive-loss limits, state taxes, AMT, SSTB / W-2 /
        UBIA QBI limits, cost seg, and individual filing status. Confirm with a CPA before acting.
      </Typography>
    </Alert>
  );
}

function MetricRow(props: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} sx={{ py: 0.25 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {props.label}
        </Typography>
        {props.detail ? (
          <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.25, display: "block" }}>
            {props.detail}
          </Typography>
        ) : null}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        {props.value}
      </Typography>
    </Stack>
  );
}

function RentalDerivedSummary({ tax }: { tax: DerivedTaxMetrics }) {
  const op = tax.operating;
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        px: 1,
        py: 0.75,
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
        Derived (not saved)
      </Typography>
      <MetricRow
        label="Annual depreciation (27.5 yr SL)"
        value={moneyDec.format(op.depreciation.annualDepreciation)}
        detail={`Building basis ${money0.format(op.basis.buildingBasis)} · land ${op.basis.landPercent}%`}
      />
      <MetricRow
        label="Simplified QBI deduction"
        value={op.qbi ? moneyDec.format(op.qbi.qbiDeduction) : "—"}
        detail={tax.assumptions.qbiEligible === false ? "Marked ineligible" : "20% cap on QBI / taxable income"}
      />
      <MetricRow label="Pre-tax cash flow / yr" value={moneyDec.format(op.preTaxCashFlowAnnual)} />
      <MetricRow
        label="After-tax cash flow / yr"
        value={op.afterTaxCashFlowAnnual != null ? moneyDec.format(op.afterTaxCashFlowAnnual) : "Set marginal rate"}
        detail={
          op.estimatedAnnualOperatingTax != null
            ? `Est. operating tax ${moneyDec.format(op.estimatedAnnualOperatingTax)}/yr`
            : undefined
        }
      />
    </Box>
  );
}

function ExitSnapshotRow({ row }: { row: DerivedTaxExitSnapshot }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        px: 1,
        py: 0.75,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.35 }}>
        Exit year {row.year}
      </Typography>
      <MetricRow label="Est. sale tax" value={moneyDec.format(row.estimatedSaleTax)} />
      <MetricRow
        label="Recapture + LTCG (est.)"
        value={moneyDec.format(
          row.saleTaxSummary.recapture.estimatedRecaptureTax +
            row.saleTaxSummary.capitalGainTax.estimatedTax
        )}
      />
      <MetricRow label="After-tax net proceeds" value={moneyDec.format(row.afterTaxNetProceeds)} />
      {row.exchange1031 ? (
        <MetricRow
          label="1031 deferred gain"
          value={moneyDec.format(row.exchange1031.deferredGain)}
          detail={`Recognized ${moneyDec.format(row.exchange1031.recognizedGain)} · boot tax in est. sale tax`}
        />
      ) : null}
      <MetricRow label="After-tax total gain" value={moneyDec.format(row.afterTaxRealWealthMade)} />
    </Box>
  );
}

function ExitDerivedSummary({ tax }: { tax: DerivedTaxMetrics }) {
  const picks = [tax.exitSnapshots.find((s) => s.year === 5), tax.exitSnapshots.find((s) => s.year === 10)].filter(
    Boolean
  ) as DerivedTaxExitSnapshot[];
  if (picks.length === 0) return null;
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        Milestone exits use modeled sale price, closing costs, and your loan term path. Operating taxes accumulate when
        marginal rate is set.
      </Typography>
      {picks.map((row) => (
        <ExitSnapshotRow key={row.year} row={row} />
      ))}
    </Stack>
  );
}

/** Optional tax assumptions + derived summary (Rental / Exit). Off until enabled. */
export function TaxAssumptionsPanel({ state, patch, derivedTax, variant }: TaxAssumptionsPanelProps) {
  const enabled = state.tax?.enabled === true;
  const landPercent = state.tax?.landPercent ?? 20;
  const improvementsBasis = state.tax?.improvementsBasis ?? 0;
  const marginalRate = state.tax?.marginalIncomeTaxRatePercent ?? 0;
  const capitalGainsRate = state.tax?.capitalGainsRatePercent ?? 15;
  const recaptureRate = state.tax?.recaptureRatePercent ?? 25;
  const taxableIncomeBeforeQbi = state.tax?.taxableIncomeBeforeQbi ?? 0;
  const replacementCost = state.tax?.exchange1031?.replacementPropertyCost ?? 0;
  const bootReceived = state.tax?.exchange1031?.bootReceived ?? 0;

  return (
    <Stack spacing={0.85}>
      <TaxDisclaimer />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={enabled}
            onChange={(_, on) => patch({ tax: on ? { enabled: true } : undefined })}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Enable simplified tax modeling
          </Typography>
        }
      />
      {!enabled ? (
        <Typography variant="caption" color="text.disabled">
          Off by default — turn on to estimate depreciation, QBI, sale tax, and after-tax cash flow / exit metrics.
        </Typography>
      ) : (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Land % of basis"
              size="small"
              fullWidth
              helperText="Non-depreciable land"
              value={formatPercentField(landPercent)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n)) return;
                patch({ tax: patchTax(state.tax, { landPercent: Math.min(100, Math.max(0, n)) }) });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
            <TextField
              label="Improvements basis"
              size="small"
              fullWidth
              helperText="Added to purchase for depreciation"
              value={formatNumberField(improvementsBasis)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n)) return;
                patch({
                  tax: patchTax(state.tax, {
                    improvementsBasis: Math.max(0, Math.round(n)) || undefined,
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Marginal income tax"
              size="small"
              fullWidth
              helperText="For after-tax cash flow (0 = skip)"
              value={formatPercentField(marginalRate)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n)) return;
                patch({
                  tax: patchTax(state.tax, {
                    marginalIncomeTaxRatePercent: Math.min(50, Math.max(0, n)) || undefined,
                  }),
                });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
            <TextField
              label="Taxable income before QBI"
              size="small"
              fullWidth
              helperText="0 = use NOI − depreciation"
              value={formatNumberField(taxableIncomeBeforeQbi)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n)) return;
                patch({
                  tax: patchTax(state.tax, {
                    taxableIncomeBeforeQbi: Math.max(0, Math.round(n)) || undefined,
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Stack>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={state.tax?.qbiEligible !== false}
                onChange={(_, on) => patch({ tax: patchTax(state.tax, { qbiEligible: on }) })}
              />
            }
            label={<Typography variant="body2">Eligible for simplified QBI (§199A)</Typography>}
          />
          {variant === "exit" ? (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Sale tax rates
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="LTCG rate"
                  size="small"
                  fullWidth
                  value={formatPercentField(capitalGainsRate)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                    if (!Number.isFinite(n)) return;
                    patch({
                      tax: patchTax(state.tax, {
                        capitalGainsRatePercent: Math.min(40, Math.max(0, n)),
                      }),
                    });
                  }}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                />
                <TextField
                  label="Recapture rate"
                  size="small"
                  fullWidth
                  value={formatPercentField(recaptureRate)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                    if (!Number.isFinite(n)) return;
                    patch({
                      tax: patchTax(state.tax, {
                        recaptureRatePercent: Math.min(40, Math.max(0, n)),
                      }),
                    });
                  }}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                />
              </Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={state.tax?.isLongTerm !== false}
                    onChange={(_, on) => patch({ tax: patchTax(state.tax, { isLongTerm: on }) })}
                  />
                }
                label={<Typography variant="body2">Long-term capital gain on non-recapture portion</Typography>}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Optional §1031 exchange
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="Replacement property cost"
                  size="small"
                  fullWidth
                  value={formatNumberField(replacementCost)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                    if (!Number.isFinite(n)) return;
                    const exchange1031 = patchTax1031(state.tax?.exchange1031, {
                      replacementPropertyCost: Math.max(0, Math.round(n)),
                    });
                    patch({
                      tax: patchTax(state.tax, { exchange1031 }),
                    });
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
                <TextField
                  label="Boot / cash received"
                  size="small"
                  fullWidth
                  value={formatNumberField(bootReceived)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                    if (!Number.isFinite(n)) return;
                    const exchange1031 = patchTax1031(state.tax?.exchange1031, {
                      bootReceived: Math.max(0, Math.round(n)),
                    });
                    patch({
                      tax: patchTax(state.tax, { exchange1031 }),
                    });
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                />
              </Stack>
            </>
          ) : null}
          {derivedTax ? (
            variant === "rental" ? (
              <RentalDerivedSummary tax={derivedTax} />
            ) : (
              <ExitDerivedSummary tax={derivedTax} />
            )
          ) : null}
        </>
      )}
    </Stack>
  );
}
