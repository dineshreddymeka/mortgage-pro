import type { AppPersisted } from "../storage/mortgageState";
import { computeInvestmentMetrics } from "./investmentMath";
import { computeMonthlyPayment, monthlyPiPayment } from "./mortgageMath";
import {
  cashFlowMonthlyFromYieldToggles,
  computeRentalAnalysis,
  postPayoffMonthlyRentForGain,
} from "./rentalMath";
import { futureHomeValue, netProceedsAtSale } from "./whenToSellMath";

/** One modeled month in the forward projection pipeline. */
export type MonthlyProjectionRow = {
  month: number;
  loanBalance: number;
  interest: number;
  scheduledPrincipal: number;
  extraPrincipal: number;
  totalPrincipal: number;
  pmi: number;
  /** Effective gross income (rent + other, after vacancy). */
  rent: number;
  operatingExpenses: number;
  noi: number;
  principalAndInterest: number;
  cashFlow: number;
  homeValue: number;
  equity: number;
};

export type MonthlyProjectionOptions = {
  maxMonths?: number;
  /** When set, cash flow follows When-to-sell yield toggles (otherwise full pro-forma). */
  yieldInclude?: Record<string, boolean>;
};

const DEFAULT_MAX_MONTHS = 360;

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * PMI drops to $0 once remaining balance is at or below 78% of the original loan amount
 * (original LTV threshold). Uses the scenario's stored `pmiMonthly` while active; does not
 * estimate PMI when the user entered $0.
 */
export function pmiForProjectionMonth(
  balanceBeforePayment: number,
  originalLoanAmount: number,
  configuredPmiMonthly: number
): number {
  const pmi = Math.max(0, Number(configuredPmiMonthly) || 0);
  if (pmi <= 0 || originalLoanAmount <= 0) return 0;
  const ltvOfOriginal = balanceBeforePayment / originalLoanAmount;
  return ltvOfOriginal <= 0.78 + 1e-9 ? 0 : pmi;
}

/** Extra principal from biweekly-style pay (13 equivalent full P&I payments per year). */
export function biweeklyEquivalentExtraPrincipal(scheduledPiMonthly: number): number {
  const pi = Math.max(0, scheduledPiMonthly);
  return pi / 12;
}

function growthFactor(annualPct: number, month: number): number {
  if (month <= 1) return 1;
  const yearsElapsed = Math.floor((month - 1) / 12);
  if (yearsElapsed <= 0) return 1;
  return (1 + clampPct(annualPct) / 100) ** yearsElapsed;
}

function lumpSumMap(state: AppPersisted): Map<number, number> {
  const out = new Map<number, number>();
  const lumps = state.paymentPlan?.lumpSums;
  if (!lumps?.length) return out;
  for (const item of lumps) {
    const month = Math.max(1, Math.min(DEFAULT_MAX_MONTHS, Math.round(Number(item.month) || 0)));
    const amount = Math.max(0, Math.round(Number(item.amount) || 0));
    if (amount <= 0) continue;
    out.set(month, (out.get(month) ?? 0) + amount);
  }
  return out;
}

function scaledRentalAnalysis(
  state: AppPersisted,
  mortgagePi: number,
  mortgagePmi: number,
  rentGrowthFactor: number,
  expenseGrowthFactor: number
) {
  const hp = Math.max(0, state.homePrice);
  const dp = Math.max(0, state.downPayment);
  const scaledState: AppPersisted = {
    ...state,
    homePrice: hp,
    downPayment: dp,
    monthlyRent: Math.max(0, state.monthlyRent) * rentGrowthFactor,
    otherMonthlyIncome: Math.max(0, state.otherMonthlyIncome) * rentGrowthFactor,
    propertyTaxAnnual: Math.max(0, state.propertyTaxAnnual) * expenseGrowthFactor,
    insuranceAnnual: Math.max(0, state.insuranceAnnual) * expenseGrowthFactor,
    hoaMonthly: Math.max(0, state.hoaMonthly) * expenseGrowthFactor,
  };
  const mortgage = computeMonthlyPayment(
    scaledState.homePrice,
    scaledState.downPayment,
    scaledState.interestRateApr,
    scaledState.termYears,
    scaledState.propertyTaxAnnual,
    scaledState.insuranceAnnual,
    scaledState.hoaMonthly,
    mortgagePmi
  );
  return computeRentalAnalysis(scaledState, {
    ...mortgage,
    principalAndInterest: mortgagePi,
  });
}

/**
 * Build month-by-month projection: loan paydown (scheduled + extra + biweekly + lump sums),
 * PMI auto-drop, rent/OpEx growth, appreciation on value, and cash flow.
 */
export function buildMonthlyProjection(
  state: AppPersisted,
  options: MonthlyProjectionOptions = {}
): MonthlyProjectionRow[] {
  const maxMonths = Math.max(1, Math.min(DEFAULT_MAX_MONTHS, options.maxMonths ?? DEFAULT_MAX_MONTHS));
  const hp = Math.max(0, state.homePrice);
  const loanAmount = Math.max(0, hp - Math.max(0, state.downPayment));
  if (hp <= 0 && loanAmount <= 0) return [];

  const termYears = Math.min(30, Math.max(1, Math.round(state.termYears)));
  const nMax = Math.max(1, termYears * 12);
  const apr = state.interestRateApr;
  const monthlyRate = apr / 100 / 12;
  const scheduledPi = monthlyPiPayment(loanAmount, monthlyRate, nMax);
  const extraMonthly = Math.max(0, Math.round(Number(state.extraPrincipalMonthly) || 0));
  const biweeklyExtra =
    state.paymentPlan?.frequency === "biweekly" ? biweeklyEquivalentExtraPrincipal(scheduledPi) : 0;
  const lumps = lumpSumMap(state);
  const rentGrowthPct = state.growth?.rentGrowthPercent ?? 0;
  const expenseGrowthPct = state.growth?.expenseGrowthPercent ?? 0;
  const appreciationPct = state.sellAnnualAppreciationPercent;

  const rows: MonthlyProjectionRow[] = [];
  let balance = loanAmount;
  const safetyCap = nMax + 600;

  for (let month = 1; month <= maxMonths; month++) {
    const balanceBefore = balance;
    const homeValue = hp > 0 ? futureHomeValue(hp, appreciationPct, month / 12) : 0;
    const rentG = growthFactor(rentGrowthPct, month);
    const expG = growthFactor(expenseGrowthPct, month);

    let interest = 0;
    let scheduledPrincipal = 0;
    let extraPrincipal = 0;
    let principalAndInterest = 0;
    let pmi = 0;
    const loanActive = balance > 1e-6 && month <= safetyCap;

    if (loanActive) {
      interest = monthlyRate <= 0 ? 0 : balance * monthlyRate;
      scheduledPrincipal = Math.max(0, Math.min(scheduledPi - interest, balance));
      const lump = lumps.get(month) ?? 0;
      extraPrincipal = extraMonthly + biweeklyExtra + lump;
      let principal = Math.min(balance, scheduledPrincipal + extraPrincipal);
      if (balance - principal < 1e-4) principal = balance;
      extraPrincipal = Math.max(0, principal - scheduledPrincipal);
      principalAndInterest = principal + interest;
      balance = Math.max(0, balance - principal);
      pmi = pmiForProjectionMonth(balanceBefore, loanAmount, state.pmiMonthly);
    }

    const analysis = scaledRentalAnalysis(state, loanActive ? scheduledPi : 0, loanActive ? pmi : 0, rentG, expG);
    const opex = analysis.operatingExpenseLines.reduce((a, l) => a + l.amount, 0);
    const cashFlow = loanActive
      ? cashFlowMonthlyFromYieldToggles(analysis, options.yieldInclude, true)
      : postPayoffMonthlyRentForGain(analysis);

    rows.push({
      month,
      loanBalance: balance,
      interest,
      scheduledPrincipal,
      extraPrincipal,
      totalPrincipal: scheduledPrincipal + extraPrincipal,
      pmi,
      rent: analysis.effectiveGrossIncomeMonthly,
      operatingExpenses: opex,
      noi: analysis.noiMonthly,
      principalAndInterest,
      cashFlow,
      homeValue,
      equity: homeValue - balance,
    });
  }

  return rows;
}

/** Net sale proceeds at the end of `exitMonth` using projected balance and modeled home value. */
export function netProceedsFromProjection(
  state: AppPersisted,
  projection: MonthlyProjectionRow[],
  exitMonth: number
): number {
  const m = Math.max(1, Math.min(projection.length, Math.round(exitMonth)));
  const row = projection[m - 1];
  if (!row) return 0;
  return netProceedsAtSale(row.homeValue, row.loanBalance, state.sellClosingCostPercent);
}

export type ExitYearInvestment = {
  year: number;
  exitMonth: number;
  netProceeds: number;
  cumulativeCashFlow: number;
  irrAnnualPercent: number | null;
  equityMultiple: number | null;
};

/** Investment metrics at standard exit years from a full monthly projection. */
export function investmentMetricsByExitYear(
  state: AppPersisted,
  projection: MonthlyProjectionRow[],
  years: readonly number[],
  initialCashInvested: number
): ExitYearInvestment[] {
  const out: ExitYearInvestment[] = [];
  for (const year of years) {
    if (year < 1) continue;
    const exitMonth = year * 12;
    if (exitMonth > projection.length) continue;
    const slice = projection.slice(0, exitMonth).map((r) => r.cashFlow);
    const netProceeds = netProceedsFromProjection(state, projection, exitMonth);
    const cumulativeCashFlow = slice.reduce((a, b) => a + b, 0);
    const { irrAnnualPercent, equityMultiple } = computeInvestmentMetricsFromSlice(
      initialCashInvested,
      slice,
      netProceeds
    );
    out.push({
      year,
      exitMonth,
      netProceeds,
      cumulativeCashFlow,
      irrAnnualPercent,
      equityMultiple,
    });
  }
  return out;
}

function computeInvestmentMetricsFromSlice(
  initialCashInvested: number,
  monthlyCashFlows: number[],
  netProceedsAtExit: number
) {
  return computeInvestmentMetrics(initialCashInvested, monthlyCashFlows, netProceedsAtExit);
}
