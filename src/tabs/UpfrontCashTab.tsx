import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { DollarPercentField } from "../components/DollarPercentField";
import { UpfrontCashScenarioPanel } from "../components/UpfrontCashScenarioPanel";
import { UpfrontCreditsPanel } from "../components/UpfrontCreditsPanel";
import { FormField, FormGrid } from "../layout/FormGrid";
import {
  FORM_CONTAINER_NAME,
  formContainerBreakpoints,
  minOperationalFontPx,
} from "../layout/formLayout";
import { deriveScenario } from "../lib/deriveScenario";
import { estimateLocationCosts } from "../lib/locationCostEstimator";
import {
  formatNumberField,
  parseNumericInput,
  syncDownPaymentDollarPatch,
  syncDownPaymentPercentPatch,
  syncHomePricePatch,
} from "../lib/mortgageInputSync";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";
import {
  UPFRONT_BOARD_LAYOUT_REVISION,
  UPFRONT_BOARD_PRESET,
  upfrontWidgetLayouts,
  upfrontWidgetLgLayout,
} from "./upfrontTabLayout";

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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: `${minOperationalFontPx}px`,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
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
        title: "Settlement summary",
        description: "Down + closing + misc · syncs Mortgage & Rental",
        defaultLayout: upfrontWidgetLgLayout("settlement"),
        defaultLayouts: upfrontWidgetLayouts("settlement"),
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
            {/* Half-width widget: cap at 2 cols for a clean 2×2 (avoid 3+1). */}
            <FormGrid maxColumns={2} compact>
              <FormField>
                <SummaryStat label="Down" value={money.format(state.downPayment)} />
              </FormField>
              <FormField>
                <SummaryStat
                  label="Closing + misc"
                  value={money.format(state.closingCosts + state.miscInitialCash)}
                />
              </FormField>
              <FormField>
                <SummaryStat label="Financed" value={money.format(loanAmount)} />
              </FormField>
              <FormField>
                <SummaryStat label="Total due" value={moneyDec.format(cashToClose)} />
              </FormField>
            </FormGrid>
          </Stack>
        ),
      },
      {
        id: "credits",
        title: "Credits & rehab",
        description: "Earnest · seller · lender · rehab",
        defaultLayout: upfrontWidgetLgLayout("credits"),
        defaultLayouts: upfrontWidgetLayouts("credits"),
        content: <UpfrontCreditsPanel state={state} patch={patch} />,
      },
      {
        id: "inputs-model",
        title: "Inputs & modeled costs",
        description: "Edit left · compare model on the right",
        defaultLayout: upfrontWidgetLgLayout("inputs-model"),
        defaultLayouts: upfrontWidgetLayouts("inputs-model"),
        content: (
          <Box
            sx={{
              containerType: "inline-size",
              containerName: FORM_CONTAINER_NAME,
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "grid",
                width: "100%",
                gap: 1.5,
                gridTemplateColumns: "minmax(0, 1fr)",
                alignItems: "start",
                // Wait for fourCol so the model track stays ≥ ~420px (not ~315 at threeCol).
                [`@container ${FORM_CONTAINER_NAME} (min-width: ${formContainerBreakpoints.fourCol}px)`]:
                  {
                    gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
                  },
              }}
            >
              <FormGrid maxColumns={2} compact>
                <FormField span={2}>
                  <TextField
                    label="Purchase price"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.homePrice)}
                    onChange={(e) => {
                      const n = parseNumericInput(e.target.value);
                      if (n === null) return;
                      patch(
                        syncHomePricePatch(n, state.downPaymentPercent, state.propertyTaxPercent)
                      );
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </FormField>
                <FormField>
                  <DollarPercentField
                    label="Down payment"
                    size="small"
                    basis={state.homePrice}
                    dollarValue={state.downPayment}
                    percentValue={state.downPaymentPercent}
                    capDollarAtBasis
                    onDollarChange={(dp) => patch(syncDownPaymentDollarPatch(dp, state.homePrice))}
                    onPercentChange={(pct) =>
                      patch(syncDownPaymentPercentPatch(pct, state.homePrice, state.downPayment))
                    }
                  />
                </FormField>
                <FormField>
                  <TextField
                    label="Closing costs"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.closingCosts)}
                    onChange={(e) => {
                      const n = parseNumericInput(e.target.value);
                      if (n !== null) patch({ closingCosts: Math.max(0, n) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </FormField>
                <FormField>
                  <TextField
                    label="Misc. one-time"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.miscInitialCash)}
                    onChange={(e) => {
                      const n = parseNumericInput(e.target.value);
                      if (n !== null) patch({ miscInitialCash: Math.max(0, n) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </FormField>
              </FormGrid>
              <UpfrontCashScenarioPanel
                state={state}
                patch={patch}
                loanAmount={loanAmount}
                cashToClose={cashToClose}
                closingCostMultiplier={locationEst.closingCostMultiplier}
                hideEditHint
              />
            </Box>
          </Box>
        ),
      },
    ],
    [cashToClose, loanAmount, locationEst.closingCostMultiplier, patch, state]
  );

  return (
    <WidgetBoard
      boardId="upfront"
      widgets={widgets}
      rowHeight={28}
      layoutRevision={UPFRONT_BOARD_LAYOUT_REVISION}
      preset={UPFRONT_BOARD_PRESET}
    />
  );
}
