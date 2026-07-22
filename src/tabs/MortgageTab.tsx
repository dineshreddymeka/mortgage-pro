import ExpandMore from "@mui/icons-material/ExpandMore";
import { Stack, Typography } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Grid from "@mui/material/Grid2";
import { useMemo } from "react";
import { AccordionSummaryMetric } from "../components/AccordionSummaryMetric";
import { AmortizationScheduleSection } from "../components/AmortizationScheduleSection";
import { MaxOfferPanel } from "../components/MaxOfferPanel";
import { MortgageLoanSummaryCard } from "../components/MortgageLoanSummaryCard";
import { MortgageInputsFields } from "../components/MortgageInputsFields";
import { MortgageAffordabilityDtiPanel } from "../components/MortgageAffordabilityDtiPanel";
import { MortgageLoanCompareCards } from "../components/MortgageLoanCompareCards";
import { MortgageRefiBreakevenCard } from "../components/MortgageRefiBreakevenCard";
import { PaymentPlanPanel } from "../components/PaymentPlanPanel";
import { LoanProductPanel } from "../components/LoanProductPanel";
import { MortgagePaymentBreakdown } from "../components/MortgagePaymentBreakdown";
import { PaydownYearlyMergedCompare } from "../components/PaydownYearlyMergedCompare";
import { PaydownYearlyColorLegend } from "../components/PaydownYearlyDetailTable";
import { WidgetBoard } from "../widgets/WidgetBoard";
import { deriveScenario } from "../lib/deriveScenario";
import {
  aggregateYearlyPaydownDetailed,
  buildAmortizationSchedule,
  buildAmortizationScheduleWithExtraPrincipal,
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

export type FinancingTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

/** @deprecated Use FinancingTab — category rename. */
export type MortgageTabProps = FinancingTabProps;

/** Category: Financing — loan inputs, payment, DTI, term/paydown/refi. */
export function FinancingTab({ state, patch }: FinancingTabProps) {
  const extraPrincipalMonthly = Math.max(0, Math.round(Number(state.extraPrincipalMonthly) || 0));

  const derived = useMemo(() => deriveScenario(state), [state]);
  const breakdown = derived.monthlyPayment;

  const baselineSchedule: AmortizationRow[] = derived.amortization;

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
    if (derived.amortizationWithExtraPrincipal) return derived.amortizationWithExtraPrincipal;
    return baselineSchedule;
  }, [baselineSchedule, derived.amortizationWithExtraPrincipal]);

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
  const cashToClose = derived.netCashToClose;

  const widgets = useMemo(
    () => [
      {
        id: "loan",
        title: "Loan & payment",
        description: `${moneyDec.format(breakdown.total)}/mo · LTV ${ltvPct.toFixed(1)}%`,
        defaultLayout: { x: 0, y: 0, w: 12, h: 16, minW: 6, minH: 10 },
        content: (
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
        ),
      },
      {
        id: "loan-product",
        title: "Loan product",
        description: `${derived.loanProduct.productType} · ${derived.loanProduct.miLabel}`,
        defaultLayout: { x: 0, y: 16, w: 12, h: 11, minW: 6, minH: 8 },
        content: <LoanProductPanel state={state} patch={patch} />,
      },
      {
        id: "affordability",
        title: "Affordability",
        description: "DTI from income and other debt",
        defaultLayout: { x: 0, y: 27, w: 12, h: 12, minW: 4, minH: 8 },
        content: (
          <Stack spacing={0.75}>
            <MortgageAffordabilityDtiPanel
              state={state}
              patch={patch}
              currentHousingPaymentMonthly={breakdown.total}
            />
            <MaxOfferPanel
              maxOffer={derived.maxOffer}
              annualGrossIncome={state.annualGrossIncome}
              customHousingBudgetMonthly={state.customHousingBudgetMonthly}
              currentHomePrice={state.homePrice}
            />
          </Stack>
        ),
      },
      {
        id: "term-tools",
        title: "Term tools",
        description: "15 vs 30 · paydown · refi",
        defaultLayout: { x: 0, y: 39, w: 12, h: 14, minW: 6, minH: 8 },
        content: (
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
                    <AccordionSummaryMetric
                      label="P&I /mo"
                      value={moneyDec.format(breakdown.principalAndInterest)}
                    />
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
                      <Typography variant="subtitle2">Full amortization schedule</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Monthly P&I · CSV export
                      </Typography>
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
                      <AccordionSummaryMetric label="Months" value={String(schedule.length)} />
                      <AccordionSummaryMetric label="Life int" value={money.format(lifeInterest)} />
                    </Stack>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <AmortizationScheduleSection
                    schedule={schedule}
                    baselineSchedule={extraPrincipalMonthly > 0 ? baselineSchedule : null}
                    totalInterest={lifeInterest}
                    totalPrincipal={lifePrincipal}
                    homePrice={state.homePrice}
                    extraPrincipalMonthly={extraPrincipalMonthly}
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
                      <Typography variant="subtitle2">Payment plan</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Biweekly equivalent · lump sums
                      </Typography>
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
                      <AccordionSummaryMetric
                        label="Frequency"
                        value={state.paymentPlan?.frequency === "biweekly" ? "Biweekly" : "Monthly"}
                      />
                      <AccordionSummaryMetric
                        label="Lumps"
                        value={String(state.paymentPlan?.lumpSums?.length ?? 0)}
                      />
                    </Stack>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <PaymentPlanPanel
                    state={state}
                    patch={patch}
                    scheduledPiMonthly={breakdown.principalAndInterest}
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
                      <AccordionSummaryMetric
                        label="P&I now"
                        value={moneyDec.format(breakdown.principalAndInterest)}
                      />
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
                    value={state.refi}
                    onChange={(refi) => patch({ refi })}
                  />
                </AccordionDetails>
              </Accordion>
            ) : null}
          </Stack>
        ),
      },
    ],
    [
      breakdown,
      cashToClose,
      extraPrincipalMonthly,
      lifeInterest,
      lifeInterest15,
      lifePrincipal,
      lifePrincipal15,
      ltvPct,
      patch,
      prepaySummary,
      baselineSchedule,
      derived,
      state,
      yearlyDetailed,
      yearlyDetailed15,
    ]
  );

  return <WidgetBoard boardId="financing" widgets={widgets} rowHeight={28} />;
}

/** @deprecated Prefer FinancingTab. */
export const MortgageTab = FinancingTab;
