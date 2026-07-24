import type { AppPersisted } from "../storage/mortgageState";
import { computeNetCashToClose } from "./buyingCostsMath";
import type { DerivedTaxMetrics } from "./deriveTaxMetrics";
import { deriveTaxMetrics } from "./deriveTaxMetrics";
import type { LoanProductResult } from "./loanProducts";
import { amortizeWithRateSchedule } from "./loanProducts";
import type { ExitYearInvestment } from "./projectionEngine";
import { buildMonthlyProjection, investmentMetricsByExitYear, type MonthlyProjectionRow } from "./projectionEngine";
import { resolveLoanProduct, resolveUpfrontAdjustments } from "./resolveLoanScenario";
import { resolveDealStrategySnapshots, type DealStrategySnapshots } from "./resolveDealStrategy";
import { resolveRentalIncome, withResolvedRentalIncome, type ResolvedRentalIncome } from "./resolveRentalIncome";
import {
  buildAmortizationSchedule,
  buildAmortizationScheduleWithExtraPrincipal,
  computeMonthlyPayment,
  impliedAnnualAppreciationPercent,
  monthlyPiPayment,
  scheduleTotals,
  type AmortizationRow,
  type MonthlyBreakdown,
} from "./mortgageMath";
import { computeMaxOfferOutputs, type MaxOfferOutputs } from "./offerMath";
import { cashFlowAnnualFromYieldToggles, computeRentalAnalysis, type RentalAnalysis } from "./rentalMath";
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
  loanProduct: LoanProductResult;
  netCashToClose: number;
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
  maxOffer: MaxOfferOutputs;
  monthlyProjection: MonthlyProjectionRow[];
  exitInvestments: ExitYearInvestment[];
  rentalIncome: ResolvedRentalIncome;
  dealStrategy: DealStrategySnapshots;
  tax: DerivedTaxMetrics | null;
};

function flat(schedule: number[]) {
  return schedule.length <= 1 || schedule.every((r) => Math.abs(r - schedule[0]!) < 1e-9);
}

function effectivePmi(state: AppPersisted, lp: LoanProductResult) {
  if (state.pmiMonthly > 0 && state.loan?.useScenarioPmi !== false && !state.loan?.miMonthlyOverride) return state.pmiMonthly;
  if (state.loan?.miMonthlyOverride !== undefined) return Math.max(0, state.loan.miMonthlyOverride);
  return lp.miMonthly;
}

function payment(state: AppPersisted, lp: LoanProductResult, termYears: number, pmi: number): MonthlyBreakdown {
  const base = computeMonthlyPayment(state.homePrice, state.downPayment, lp.noteApr, termYears, state.propertyTaxAnnual, state.insuranceAnnual, state.hoaMonthly, 0);
  let pi = base.principalAndInterest;
  if (lp.totalLoanAmount > 0) {
    pi = flat(lp.rateSchedule)
      ? monthlyPiPayment(lp.totalLoanAmount, lp.noteApr / 100 / 12, Math.max(1, Math.round(termYears * 12)))
      : amortizeWithRateSchedule(lp.totalLoanAmount, lp.rateSchedule, termYears).principalAndInterest;
  }
  return { ...base, principalAndInterest: pi, pmi, total: pi + base.propertyTax + base.insurance + base.hoa + pmi, loanAmount: lp.totalLoanAmount };
}

function amort(lp: LoanProductResult, termYears: number): AmortizationRow[] {
  if (lp.totalLoanAmount <= 0) return [];
  if (flat(lp.rateSchedule)) return buildAmortizationSchedule(lp.totalLoanAmount, lp.noteApr, termYears);
  return amortizeWithRateSchedule(lp.totalLoanAmount, lp.rateSchedule, termYears).rows.map((r) => ({ month: r.month, payment: r.payment, principal: r.principal, interest: r.interest, balance: r.balance }));
}

export function deriveScenario(state: AppPersisted): DerivedScenario {
  const rentalIncome = resolveRentalIncome(state);
  const effective = withResolvedRentalIncome(state);
  const hp = Math.max(0, effective.homePrice);
  const dp = Math.max(0, effective.downPayment);
  const lp = resolveLoanProduct(effective);
  const termYears = Math.min(30, Math.max(1, Math.round(effective.loan?.termYears ?? effective.termYears)));
  const pmi = effectivePmi(effective, lp);
  const net = computeNetCashToClose(dp, effective.closingCosts, effective.miscInitialCash, resolveUpfrontAdjustments(effective, lp.pointsUpfrontCost));
  const monthlyPayment = payment(effective, lp, termYears, pmi);
  const monthlyPayment30 = payment(effective, lp, 30, pmi);
  const monthlyPayment15 = payment(effective, lp, 15, pmi);
  const amortization = amort(lp, termYears);
  const amortizationWithExtraPrincipal = effective.extraPrincipalMonthly > 0 ? buildAmortizationScheduleWithExtraPrincipal(lp.totalLoanAmount, lp.noteApr, termYears, effective.extraPrincipalMonthly) : null;
  const rental = computeRentalAnalysis(effective, monthlyPayment);
  const rental30 = computeRentalAnalysis(effective, monthlyPayment30);
  const rental15 = computeRentalAnalysis(effective, monthlyPayment15);
  const monthlyProjection = buildMonthlyProjection(effective, { yieldInclude: effective.sellRentalYieldInclude });
  const dealStrategy = resolveDealStrategySnapshots(effective);
  const sellRows = buildSellYearlyRows(
    lp.totalLoanAmount,
    lp.noteApr,
    hp,
    effective.sellAnnualAppreciationPercent,
    effective.sellClosingCostPercent,
    30,
    termYears
  );
  const realWealthSnapshots = buildRealWealthExitSnapshots(
    effective,
    lp.totalLoanAmount,
    lp.noteApr,
    sellRows,
    REAL_WEALTH_MILESTONE_YEARS,
    effective.sellRentalYieldInclude
  );
  return {
    purchasePrice: hp,
    downPayment: dp,
    loanAmount: lp.totalLoanAmount,
    termYears,
    loanProduct: lp,
    netCashToClose: net.netCashToClose,
    monthlyPayment,
    monthlyPayment15,
    monthlyPayment30,
    amortization,
    amortizationWithExtraPrincipal,
    amortizationTotals: scheduleTotals(amortization),
    amortizationPrepayTotals: amortizationWithExtraPrincipal ? scheduleTotals(amortizationWithExtraPrincipal) : null,
    rental,
    rental15,
    rental30,
    yieldCashFlowAnnual15: cashFlowAnnualFromYieldToggles(rental15, effective.sellRentalYieldInclude),
    yieldCashFlowAnnual30: cashFlowAnnualFromYieldToggles(rental30, effective.sellRentalYieldInclude),
    sellRows,
    realWealthSnapshots,
    impliedAnnualAppreciationPercent: impliedAnnualAppreciationPercent(hp, effective.currentHomeValue, effective.yearsOwned),
    maxOffer: computeMaxOfferOutputs(effective),
    monthlyProjection,
    exitInvestments: investmentMetricsByExitYear(effective, monthlyProjection, REAL_WEALTH_MILESTONE_YEARS, rental.initialCashInvested),
    rentalIncome,
    dealStrategy,
    tax: deriveTaxMetrics(effective, rental, realWealthSnapshots),
  };
}
