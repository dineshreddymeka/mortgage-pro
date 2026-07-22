import type { MonthlyBreakdown } from "./mortgageMath";
import { computeNetCashToClose } from "./buyingCostsMath";
import { resolveLoanProduct, resolveUpfrontAdjustments } from "./resolveLoanScenario";
import type { AppPersisted } from "../storage/mortgageState";

/** P&amp;I row id for `sellRentalYieldInclude` (matches pro-forma). */
export const RENTAL_YIELD_PI_ID = "pi";

/** PMI row id for `sellRentalYieldInclude` (matches pro-forma / composition). */
export const RENTAL_YIELD_PMI_ID = "pmi";

export type RentalLineItem = { id: string; label: string; amount: number };

export type RentalPieSlice = { id: string; label: string; amount: number };

export type RentalAnalysis = {
  grossScheduledIncomeMonthly: number;
  vacancyLossMonthly: number;
  effectiveGrossIncomeMonthly: number;
  operatingExpenseLines: RentalLineItem[];
  noiMonthly: number;
  noiAnnual: number;
  capRate: number;
  principalAndInterestMonthly: number;
  pmiMonthly: number;
  cashFlowMonthly: number;
  cashFlowAnnual: number;
  initialCashInvested: number;
  cashOnCash: number;
  /** NOI ÷ annual debt service (P&I + PMI). Null for all-cash / no debt service. */
  dscr: number | null;
  /** Purchase price ÷ annual gross scheduled income. Null when price or rent is zero. */
  grossRentMultiplier: number | null;
  /** Base monthly rent ÷ purchase price (1% rule ratio). Null when price or rent is zero. */
  onePercentRuleRatio: number | null;
  /** Where monthly EGI goes: debt service, OpEx line items, remainder = cash flow */
  composition: RentalPieSlice[];
};

/** NOI ÷ annual debt service. Null when there is no debt service (all-cash). */
export function computeDscr(
  noiAnnual: number,
  principalAndInterestMonthly: number,
  pmiMonthly: number
): number | null {
  const debtServiceAnnual = (Math.max(0, principalAndInterestMonthly) + Math.max(0, pmiMonthly)) * 12;
  if (debtServiceAnnual <= 0) return null;
  const ratio = noiAnnual / debtServiceAnnual;
  return Number.isFinite(ratio) ? ratio : null;
}

/** Purchase price ÷ annual gross scheduled income. Null when price or GSI is zero. */
export function computeGrossRentMultiplier(
  purchasePrice: number,
  grossScheduledIncomeMonthly: number
): number | null {
  const hp = Math.max(0, purchasePrice);
  const annualGross = Math.max(0, grossScheduledIncomeMonthly) * 12;
  if (hp <= 0 || annualGross <= 0) return null;
  const grm = hp / annualGross;
  return Number.isFinite(grm) ? grm : null;
}

/** Base monthly rent ÷ purchase price (decimal; 0.01 = 1% rule). Null when price or rent is zero. */
export function computeOnePercentRuleRatio(purchasePrice: number, monthlyRent: number): number | null {
  const hp = Math.max(0, purchasePrice);
  const rent = Math.max(0, monthlyRent);
  if (hp <= 0 || rent <= 0) return null;
  const ratio = rent / hp;
  return Number.isFinite(ratio) ? ratio : null;
}

/**
 * Pro-forma rental analysis. NOI excludes P&I. Cash flow = EGI − operating expenses − P&I.
 * Management % is applied to gross scheduled income (rent + other). Maintenance & CapEx %
 * are applied to base monthly rent only (typical “% of rent” reserve).
 */
export function computeRentalAnalysis(
  s: AppPersisted,
  mortgage: MonthlyBreakdown
): RentalAnalysis {
  const purchasePrice = Math.max(0, s.homePrice);
  const rent = Math.max(0, s.monthlyRent);
  const other = Math.max(0, s.otherMonthlyIncome);
  const vacancyPct = clamp(s.vacancyRatePercent, 0, 100);
  const gsi = rent + other;
  const vacancyLoss = gsi * (vacancyPct / 100);
  const egi = gsi - vacancyLoss;

  const mgmt = gsi * (clamp(s.propertyMgmtPercent, 0, 100) / 100);
  const maint = rent * (clamp(s.maintenancePercent, 0, 100) / 100);
  const capex = rent * (clamp(s.capexPercent, 0, 100) / 100);
  const propertyTax = mortgage.propertyTax;
  const insurance = mortgage.insurance;
  const hoa = mortgage.hoa;

  const operatingExpenseLines: RentalLineItem[] = [
    { id: "mgmt", label: "Property management", amount: mgmt },
    { id: "maint", label: "Maintenance & repairs", amount: maint },
    { id: "capex", label: "CapEx reserve", amount: capex },
    { id: "tax", label: "Property taxes", amount: propertyTax },
    { id: "ins", label: "Insurance", amount: insurance },
    { id: "hoa", label: "HOA", amount: hoa },
  ];

  const totalOpex = operatingExpenseLines.reduce((a, b) => a + b.amount, 0);
  const noiMonthly = egi - totalOpex;
  const noiAnnual = noiMonthly * 12;
  const capRate = purchasePrice > 0 ? noiAnnual / purchasePrice : 0;

  const pi = mortgage.principalAndInterest;
  const pmi = mortgage.pmi;
  const cashFlowMonthly = noiMonthly - pi - pmi;
  const cashFlowAnnual = cashFlowMonthly * 12;

  const initialCashInvested = computeInitialCashInvested(s);
  const cashOnCash =
    initialCashInvested > 0 ? cashFlowAnnual / initialCashInvested : 0;

  const dscr = computeDscr(noiAnnual, pi, pmi);
  const grossRentMultiplier = computeGrossRentMultiplier(purchasePrice, gsi);
  const onePercentRuleRatio = computeOnePercentRuleRatio(purchasePrice, rent);

  /** Monthly debt service + operating costs (visual “where money goes” before cash flow). */
  const composition: RentalPieSlice[] = [
    { id: "pi", label: "Principal & interest", amount: pi },
    ...(pmi > 0.0001 ? [{ id: RENTAL_YIELD_PMI_ID, label: "PMI", amount: pmi }] : []),
    ...operatingExpenseLines.map((l) => ({ id: l.id, label: l.label, amount: l.amount })),
  ].filter((x) => x.amount > 0.0001);

  return {
    grossScheduledIncomeMonthly: gsi,
    vacancyLossMonthly: vacancyLoss,
    effectiveGrossIncomeMonthly: egi,
    operatingExpenseLines,
    noiMonthly,
    noiAnnual,
    capRate,
    principalAndInterestMonthly: pi,
    pmiMonthly: pmi,
    cashFlowMonthly,
    cashFlowAnnual,
    initialCashInvested,
    cashOnCash,
    dscr,
    grossRentMultiplier,
    onePercentRuleRatio,
    composition,
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function computeInitialCashInvested(state: AppPersisted): number {
  const lp = resolveLoanProduct(state);
  const net = computeNetCashToClose(state.downPayment, state.closingCosts, state.miscInitialCash, resolveUpfrontAdjustments(state, lp.pointsUpfrontCost));
  return net.grossCashRequired - net.sellerCredit - net.lenderCredit;
}

/**
 * Rental cash flow per year (annualized) with optional line exclusions for When to sell gain.
 * `include[id] === false` omits that operating expense or, for {@link RENTAL_YIELD_PI_ID}, P&amp;I.
 * Missing keys mean include (same as Rental tab pro-forma “on”).
 */
/** Monthly cash flow for gain math with optional P&amp;I and per-line OpEx toggles. */
export function cashFlowMonthlyFromYieldToggles(
  analysis: RentalAnalysis,
  include: Record<string, boolean> | undefined,
  chargePrincipalAndInterest: boolean
): number {
  const egi = analysis.effectiveGrossIncomeMonthly;
  const pi = analysis.principalAndInterestMonthly;
  const pmi = analysis.pmiMonthly;
  let opex = 0;
  for (const line of analysis.operatingExpenseLines) {
    if (include?.[line.id] === false) continue;
    opex += line.amount;
  }
  const userWantsPiInGain = include?.[RENTAL_YIELD_PI_ID] !== false;
  const userWantsPmiInGain = include?.[RENTAL_YIELD_PMI_ID] !== false;
  const noiMonthly = egi - opex;
  const debt =
    (userWantsPiInGain && chargePrincipalAndInterest ? pi : 0) +
    (userWantsPmiInGain && chargePrincipalAndInterest ? pmi : 0);
  const cashFlowMonthly = noiMonthly - debt;
  return cashFlowMonthly;
}

export function cashFlowAnnualFromYieldToggles(
  analysis: RentalAnalysis,
  include: Record<string, boolean> | undefined
): number {
  return cashFlowMonthlyFromYieldToggles(analysis, include, true) * 12;
}

/**
 * Months after the loan is paid off: total gain uses effective gross income only
 * (rent + other income, minus vacancy) — no property operating expenses and no P&amp;I.
 */
export function postPayoffMonthlyRentForGain(analysis: RentalAnalysis): number {
  return analysis.effectiveGrossIncomeMonthly;
}

/**
 * Sum through `exitMonths`: while the loan is active, same as {@link cashFlowMonthlyFromYieldToggles}
 * (yield toggles, P&amp;I through payoff). After payoff, each month adds {@link postPayoffMonthlyRentForGain}
 * (EGI only — not NOI).
 */
export function cumulativeCashFlowThroughExitMonths(
  analysis: RentalAnalysis,
  include: Record<string, boolean> | undefined,
  loanTermYears: number,
  exitMonths: number
): number {
  const termY = Math.min(30, Math.max(1, Math.round(loanTermYears)));
  const amortMonths = termY * 12;
  const n = Math.max(0, Math.min(360, Math.floor(exitMonths)));
  let total = 0;
  for (let m = 1; m <= n; m++) {
    const loanActive = m <= amortMonths;
    total += loanActive
      ? cashFlowMonthlyFromYieldToggles(analysis, include, true)
      : postPayoffMonthlyRentForGain(analysis);
  }
  return total;
}
