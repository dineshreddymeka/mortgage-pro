import ExpandMore from "@mui/icons-material/ExpandMore";
import { Stack, Typography } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Grid from "@mui/material/Grid2";
import { useMemo, type ReactNode } from "react";
import { AccordionSummaryMetric } from "../components/AccordionSummaryMetric";
import { AppSection } from "../components/AppSection";
import { MortgageBuyerCashPanel } from "../components/MortgageBuyerCashPanel";
import { MortgageLoanSummaryCard } from "../components/MortgageLoanSummaryCard";
import { MortgageInputsFields } from "../components/MortgageInputsFields";
import { MortgageAffordabilityDtiPanel } from "../components/MortgageAffordabilityDtiPanel";
import { MortgageLoanCompareCards } from "../components/MortgageLoanCompareCards";
import { MortgageRefiBreakevenCard } from "../components/MortgageRefiBreakevenCard";
import { MortgagePaymentBreakdown } from "../components/MortgagePaymentBreakdown";
import { PaydownYearlyMergedCompare } from "../components/PaydownYearlyMergedCompare";
import { PaydownYearlyColorLegend } from "../components/PaydownYearlyDetailTable";
import {
  aggregateYearlyPaydownDetailed,
  buildAmortizationSchedule,
  buildAmortizationScheduleWithExtraPrincipal,
  computeMonthlyPayment,
  scheduleTotals,
  type AmortizationRow,
} from "../lib/mortgageMath";
import type { AppPersisted } from "../storage/mortgageState";

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

const summarySx = {
  px: 1.25,
  minHeight: 42,
  alignItems: "flex-start",
  "& .MuiAccordionSummary-content": { my: 0.5, width: "100%", maxWidth: "calc(100% - 36px)" },
} as const;

export type MortgageTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

export function MortgageTab({ state, patch }: MortgageTabProps) {
  const extraPrincipalMonthly = Math.max(0, Math.round(Number(state.extraPrincipalMonthly) || 0));

  const breakdown = useMemo(
    () =>
      computeMonthlyPayment(
        state.homePrice,
        state.downPayment,
        state.interestRateApr,
        state.termYears,
        state.propertyTaxAnnual,
        state.insuranceAnnual,
        state.hoaMonthly,
        state.pmiMonthly
      ),
    [
      state.downPayment,
      state.downPaymentPercent,
      state.homePrice,
      state.hoaMonthly,
      state.insuranceAnnual,
      state.interestRateApr,
      state.propertyTaxAnnual,
      state.propertyTaxPercent,
      state.termYears,
      state.pmiMonthly,
    ]
  );

  const baselineSchedule: AmortizationRow[] = useMemo(
    () => buildAmortizationSchedule(breakdown.loanAmount, state.interestRateApr, state.termYears),
    [breakdown.loanAmount, state.interestRateApr, state.termYears]
  );

  const baselineSchedule15: AmortizationRow[] = useMemo(
    () => buildAmortizationSchedule(breakdown.loanAmount, state.interestRateApr, 15),
    [breakdown.loanAmount, state.interestRateApr]
  );

  const schedule15: AmortizationRow[] = useMemo(() => {
    if (breakdown.loanAmount <= 0) return [];
    if (extraPrincipalMonthly > 0) {
      return buildAmortizationScheduleWithExtraPrincipal(
        breakdown.loanAmount,
        state.interestRateApr,
        15,
        extraPrincipalMonthly
      );
    }
    return baselineSchedule15;
  }, [baselineSchedule15, breakdown.loanAmount, extraPrincipalMonthly, state.interestRateApr]);

  const yearlyDetailed15 = useMemo(
    () => aggregateYearlyPaydownDetailed(schedule15, breakdown.loanAmount),
    [schedule15, breakdown.loanAmount]
  );
  const { totalInterest: lifeInterest15, totalPrincipal: lifePrincipal15 } = useMemo(
    () => scheduleTotals(schedule15),
    [schedule15]
  );

  const schedule: AmortizationRow[] = useMemo(() => {
    if (extraPrincipalMonthly > 0) {
      return buildAmortizationScheduleWithExtraPrincipal(
        breakdown.loanAmount,
        state.interestRateApr,
        state.termYears,
        extraPrincipalMonthly
      );
    }
    return baselineSchedule;
  }, [
    baselineSchedule,
    breakdown.loanAmount,
    extraPrincipalMonthly,
    state.interestRateApr,
    state.termYears,
  ]);

  const baselineTotals = useMemo(() => scheduleTotals(baselineSchedule), [baselineSchedule]);

  const yearlyDetailed = useMemo(
    () => aggregateYearlyPaydownDetailed(schedule, breakdown.loanAmount),
    [schedule, breakdown.loanAmount]
  );
  const { totalInterest: lifeInterest, totalPrincipal: lifePrincipal } = useMemo(
    () => scheduleTotals(schedule),
    [schedule]
  );

  const prepaySummary = useMemo(() => {
    if (extraPrincipalMonthly <= 0 || breakdown.loanAmount <= 0) return null;
    const pt = scheduleTotals(schedule);
    const interestSaved = baselineTotals.totalInterest - pt.totalInterest;
    const monthsSaved = baselineSchedule.length - schedule.length;
    const payoffMo = schedule.length;
    return {
      interestSaved,
      monthsSaved,
      payoffMo,
      baselineInterest: baselineTotals.totalInterest,
    };
  }, [
    baselineSchedule.length,
    baselineTotals.totalInterest,
    breakdown.loanAmount,
    schedule,
    extraPrincipalMonthly,
  ]);

  const ltvPct = state.homePrice > 0 ? (breakdown.loanAmount / state.homePrice) * 100 : 0;
  const cashToClose = state.downPayment + state.closingCosts + state.miscInitialCash;

  return (
    <BoxSections>
      <AppSection
        title="Loan & payment"
        description={`${moneyDec.format(breakdown.total)}/mo · LTV ${ltvPct.toFixed(1)}% · cash ${money.format(cashToClose)}`}
      >
        <Grid container spacing={1.25} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 6 }}>
            <MortgageInputsFields state={state} patch={patch} compactGrid inputSize="small" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <MortgagePaymentBreakdown breakdown={breakdown} />
              <MortgageLoanSummaryCard
                state={state}
                breakdown={breakdown}
                cashToClose={cashToClose}
                ltvPct={ltvPct}
                lifeInterest={lifeInterest}
                lifePrincipal={lifePrincipal}
                extraPrincipalMonthly={extraPrincipalMonthly}
                prepaySummary={prepaySummary}
              />
            </Stack>
          </Grid>
        </Grid>
      </AppSection>

      <AppSection title="Cash to close" description="Shared with Upfront">
        <MortgageBuyerCashPanel
          state={state}
          patch={patch}
          loanAmount={breakdown.loanAmount}
          cashToClose={cashToClose}
        />
      </AppSection>

      <AppSection title="Compare" description="Term, paydown, refi">
        <Stack spacing={0.75}>
          <Accordion defaultExpanded={false} disableGutters elevation={0}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={0.75}
                alignItems={{ sm: "flex-end" }}
                justifyContent="space-between"
                sx={{ width: "100%", gap: 0.75 }}
              >
                <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2">Compare loan length</Typography>
                  <Typography variant="caption" color="text.secondary">
                    15 vs 30 · monthly split &amp; life interest
                  </Typography>
                </Stack>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
                  <AccordionSummaryMetric label="Loan" value={money.format(breakdown.loanAmount)} />
                  <AccordionSummaryMetric label="P&I /mo" value={moneyDec.format(breakdown.principalAndInterest)} />
                </Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <MortgageLoanCompareCards state={state} />
            </AccordionDetails>
          </Accordion>

          {breakdown.loanAmount > 0 ? (
            <Accordion defaultExpanded={false} disableGutters elevation={0}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={0.75}
                  alignItems={{ sm: "flex-end" }}
                  justifyContent="space-between"
                  sx={{ width: "100%", gap: 0.75 }}
                >
                  <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2">Year-by-year paydown</Typography>
                    <Typography variant="caption" color="text.secondary">
                      15-yr vs {state.termYears}-yr
                    </Typography>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
                    <AccordionSummaryMetric label="Life int (15)" value={money.format(lifeInterest15)} />
                    <AccordionSummaryMetric
                      label={`Life int (${state.termYears})`}
                      value={money.format(lifeInterest)}
                    />
                  </Stack>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <PaydownYearlyColorLegend />
                <PaydownYearlyMergedCompare
                  rows15={yearlyDetailed15}
                  rowsTerm={yearlyDetailed}
                  termYearsLabel={state.termYears}
                  lifePrincipal15={lifePrincipal15}
                  lifeInterest15={lifeInterest15}
                  lifePrincipalTerm={lifePrincipal}
                  lifeInterestTerm={lifeInterest}
                />
              </AccordionDetails>
            </Accordion>
          ) : null}

          {breakdown.loanAmount > 0 ? (
            <Accordion defaultExpanded={false} disableGutters elevation={0}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={0.75}
                  alignItems={{ sm: "flex-end" }}
                  justifyContent="space-between"
                  sx={{ width: "100%", gap: 0.75 }}
                >
                  <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2">Refi breakeven</Typography>
                    <Typography variant="caption" color="text.secondary">
                      New rate vs costs
                    </Typography>
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
                    <AccordionSummaryMetric label="P&I now" value={moneyDec.format(breakdown.principalAndInterest)} />
                    <AccordionSummaryMetric label="Note %" value={`${state.interestRateApr}%`} />
                  </Stack>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <MortgageRefiBreakevenCard
                  scenarioLoanAmount={breakdown.loanAmount}
                  scenarioPrincipalAndInterest={breakdown.principalAndInterest}
                  scenarioAprPercent={state.interestRateApr}
                  defaultRefiClosingCosts={state.closingCosts}
                  schedule={schedule}
                />
              </AccordionDetails>
            </Accordion>
          ) : null}
        </Stack>
      </AppSection>

      <AppSection title="Affordability" description="DTI from income and other debt">
        <MortgageAffordabilityDtiPanel
          state={state}
          patch={patch}
          currentHousingPaymentMonthly={breakdown.total}
        />
      </AppSection>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", pt: 0.25, lineHeight: 1.35 }}>
        Single-scenario calculator — numbers stay in your browser until export or reset.
      </Typography>
    </BoxSections>
  );
}

function BoxSections({ children }: { children: ReactNode }) {
  return <Stack spacing={0}>{children}</Stack>;
}
