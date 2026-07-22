import type { AppPersisted } from "../storage/mortgageState";
import type { ExitYearInvestment } from "./projectionEngine";
import {
  buildMonthlyProjection,
  investmentMetricsByExitYear,
  type MonthlyProjectionRow,
} from "./projectionEngine";
import {
  buildAmortizationSchedule,
  buildAmortizationScheduleWithExtraPrincipal,
  computeMonthlyPayment,
  impliedAnnualAppreciationPercent,
  scheduleTotals,
  type AmortizationRow,
  type MonthlyBreakdown,
} from "./mortgageMath";
import { computeMaxOfferOutputs, type MaxOfferOutputs } from "./offerMath";
import {
  cashFlowAnnualFromYieldToggles,
  computeRentalAnalysis,
  type RentalAnalysis,
} from "./rentalMath";
import {
  buildRealWealthExitSnapshots,
  buildSellYearlyRows,
  REAL_WEALTH_MILESTONE_YEARS,
  type RealWealthExitSnapshot,
  type SellYearRow,
} from "./whenToSellMath";

export type DerivedScenario = {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  termYears: number;
  /** Monthly payment for the scenario loan term. */
  monthlyPayment: MonthlyBreakdown;
  monthlyPayment15: MonthlyBreakdown;
  monthlyPayment30: MonthlyBreakdown;
  amortization: AmortizationRow[];
  amortizationWithExtraPrincipal: AmortizationRow[] | null;
  amortizationTotals: ReturnType<typeof scheduleTotals>;
  amortizationPrepayTotals: ReturnType<typeof scheduleTotals> | null;
  rental: RentalAnalysis;
  rental15: RentalAnalysis;
  rental30: RentalAnalysis;
  yieldCashFlowAnnual15: number;
  yieldCashFlowAnnual30: number;
  sellRows: SellYearRow[];
  realWealthSnapshots: RealWealthExitSnapshot[];
  impliedAnnualAppreciationPercent: number;
  /** Derived max-offer caps (not persisted). */
  maxOffer: MaxOfferOutputs;
  /** Month-by-month forward model (growth, payment plan, PMI drop). */
  monthlyProjection: MonthlyProjectionRow[];
  /** IRR / equity multiple at milestone exit years (derived). */
  exitInvestments: ExitYearInvestment[];
};

/** Central derived-data pipeline — payment, schedules, rental, exit, and projection outputs from one scenario. */
export function deriveScenario(state: AppPersisted): DerivedScenario {
  const hp = Math.max(0, state.homePrice);
  const dp = Math.max(0, state.downPayment);
  const loanAmount = Math.max(0, hp - dp);
  const apr = state.interestRateApr;
  const termYears = Math.min(30, Math.max(1, Math.round(state.termYears)));

  const monthlyPayment = computeMonthlyPayment(
    hp,
    dp,
    apr,
    termYears,
    state.propertyTaxAnnual,
    state.insuranceAnnual,
    state.hoaMonthly,
    state.pmiMonthly
  );
  const monthlyPayment30 = computeMonthlyPayment(
    hp,
    dp,
    apr,
    30,
    state.propertyTaxAnnual,
    state.insuranceAnnual,
    state.hoaMonthly,
    state.pmiMonthly
  );
  const monthlyPayment15 = computeMonthlyPayment(
    hp,
    dp,
    apr,
    15,
    state.propertyTaxAnnual,
    state.insuranceAnnual,
    state.hoaMonthly,
    state.pmiMonthly
  );

  const amortization = buildAmortizationSchedule(loanAmount, apr, termYears);
  const amortizationTotals = scheduleTotals(amortization);
  const amortizationWithExtraPrincipal =
    state.extraPrincipalMonthly > 0
      ? buildAmortizationScheduleWithExtraPrincipal(
          loanAmount,
          apr,
          termYears,
          state.extraPrincipalMonthly
        )
      : null;
  const amortizationPrepayTotals = amortizationWithExtraPrincipal
    ? scheduleTotals(amortizationWithExtraPrincipal)
    : null;

  const rental = computeRentalAnalysis(state, monthlyPayment);
  const rental30 = computeRentalAnalysis(state, monthlyPayment30);
  const rental15 = computeRentalAnalysis(state, monthlyPayment15);

  const yieldCashFlowAnnual30 = cashFlowAnnualFromYieldToggles(
    rental30,
    state.sellRentalYieldInclude
  );
  const yieldCashFlowAnnual15 = cashFlowAnnualFromYieldToggles(
    rental15,
    state.sellRentalYieldInclude
  );

  const sellRows = buildSellYearlyRows(
    loanAmount,
    apr,
    hp,
    state.sellAnnualAppreciationPercent,
    state.sellClosingCostPercent,
    30,
    termYears
  );
  const realWealthSnapshots = buildRealWealthExitSnapshots(
    state,
    loanAmount,
    apr,
    sellRows,
    REAL_WEALTH_MILESTONE_YEARS,
    state.sellRentalYieldInclude
  );

  const monthlyProjection = buildMonthlyProjection(state, {
    yieldInclude: state.sellRentalYieldInclude,
  });
  const exitInvestments = investmentMetricsByExitYear(
    state,
    monthlyProjection,
    REAL_WEALTH_MILESTONE_YEARS,
    rental.initialCashInvested
  );

  return {
    purchasePrice: hp,
    downPayment: dp,
    loanAmount,
    termYears,
    monthlyPayment,
    monthlyPayment15,
    monthlyPayment30,
    amortization,
    amortizationWithExtraPrincipal,
    amortizationTotals,
    amortizationPrepayTotals,
    rental,
    rental15,
    rental30,
    yieldCashFlowAnnual15,
    yieldCashFlowAnnual30,
    sellRows,
    realWealthSnapshots,
    impliedAnnualAppreciationPercent: impliedAnnualAppreciationPercent(
      hp,
      state.currentHomeValue,
      state.yearsOwned
    ),
    maxOffer: computeMaxOfferOutputs(state),
    monthlyProjection,
    exitInvestments,
  };
}
