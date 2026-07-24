import type { AppPersisted } from "../storage/mortgageState";
import {
  computeMonthlyPayment,
  estimatePmiMonthly,
  maxHomePriceForHousingBudget,
  type HousingPaymentAtPriceParams,
} from "./mortgageMath";
import { computeRentalAnalysis } from "./rentalMath";

export type OfferTargets = {
  targetDscr?: number;
  targetCashFlowMonthly?: number;
  targetCashOnCashPercent?: number;
  targetPaymentMonthly?: number;
};

export type MaxOfferOutputs = {
  /** Max price at 28% front-end DTI housing cap (0 = none found). */
  fromDti28Pct: number;
  /** Max price for persisted/custom monthly housing budget (0 = none / unset). */
  fromCustomHousingBudget: number;
  /** Max price meeting target DSCR (0 = none / no target / no debt path). */
  fromTargetDscr: number;
  /** Max price meeting target monthly cash flow (0 = none / no target). */
  fromTargetCashFlow: number;
  /** Max price meeting target cash-on-cash % (0 = none / no target). */
  fromTargetCashOnCash: number;
  /** Max price meeting target total housing payment (0 = none / no target). */
  fromTargetPayment: number;
  /** Targets read from optional `offerTargets` (not persisted derived output). */
  targets: OfferTargets | null;
  /** Lowest positive cap across all active constraints. */
  bindingCap: number;
};

/** Read optional offer targets preserved on the scenario blob. */
export function readOfferTargets(state: AppPersisted): OfferTargets | null {
  const raw = (state as Record<string, unknown>).offerTargets;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: OfferTargets = {};

  const dscr = o.targetDscr !== undefined && o.targetDscr !== null ? Number(o.targetDscr) : undefined;
  if (dscr !== undefined && Number.isFinite(dscr) && dscr > 0) out.targetDscr = dscr;

  const cf =
    o.targetCashFlowMonthly !== undefined && o.targetCashFlowMonthly !== null
      ? Number(o.targetCashFlowMonthly)
      : undefined;
  if (cf !== undefined && Number.isFinite(cf)) out.targetCashFlowMonthly = Math.max(0, cf);

  const coc =
    o.targetCashOnCashPercent !== undefined && o.targetCashOnCashPercent !== null
      ? Number(o.targetCashOnCashPercent)
      : undefined;
  if (coc !== undefined && Number.isFinite(coc) && coc > 0) out.targetCashOnCashPercent = coc;

  const pmt =
    o.targetPaymentMonthly !== undefined && o.targetPaymentMonthly !== null
      ? Number(o.targetPaymentMonthly)
      : undefined;
  if (pmt !== undefined && Number.isFinite(pmt) && pmt > 0) out.targetPaymentMonthly = Math.round(pmt);

  return Object.keys(out).length > 0 ? out : null;
}

function scenarioAtHomePrice(state: AppPersisted, homePrice: number, base: Omit<HousingPaymentAtPriceParams, "homePrice">) {
  const hp = Math.max(0, homePrice);
  const dpPct = Math.min(100, Math.max(0, base.downPaymentPercent));
  const down = Math.round((hp * dpPct) / 100);
  const taxAnnual = hp > 0 ? Math.round((hp * base.propertyTaxPercent) / 100) : 0;
  const loan = Math.max(0, hp - down);
  const pmi =
    base.explicitPmiMonthly > 0
      ? Math.max(0, base.explicitPmiMonthly)
      : estimatePmiMonthly(loan, dpPct);
  const mortgage = computeMonthlyPayment(
    hp,
    down,
    base.interestRateApr,
    base.termYears,
    taxAnnual,
    base.insuranceAnnual,
    base.hoaMonthly,
    pmi
  );
  const scenarioSlice: AppPersisted = {
    ...state,
    homePrice: hp,
    downPayment: down,
    propertyTaxAnnual: taxAnnual,
  };
  return { mortgage, rental: computeRentalAnalysis(scenarioSlice, mortgage) };
}

function dscrAtHomePrice(
  homePrice: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number | null {
  return scenarioAtHomePrice(state, homePrice, base).rental.dscr;
}

function cashFlowAtHomePrice(
  homePrice: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  return scenarioAtHomePrice(state, homePrice, base).rental.cashFlowMonthly;
}

function cashOnCashAtHomePrice(
  homePrice: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  return scenarioAtHomePrice(state, homePrice, base).rental.cashOnCash;
}

function paymentAtHomePrice(
  homePrice: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  return scenarioAtHomePrice(state, homePrice, base).mortgage.total;
}

function binarySearchMaxPrice(
  meetsTarget: (price: number) => boolean,
  lo = 25_000,
  hi = 20_000_000
): number {
  if (!meetsTarget(hi)) {
    if (!meetsTarget(lo)) return 0;
    let left = lo;
    let right = hi;
    for (let i = 0; i < 50; i++) {
      const mid = (left + right) / 2;
      if (meetsTarget(mid)) left = mid;
      else right = mid;
    }
    return Math.round(left);
  }
  return hi;
}

/** Binary search: max purchase price whose modeled DSCR ≥ `targetDscr`. Returns 0 when none. */
export function maxHomePriceForTargetDscr(
  targetDscr: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  const target = Math.max(0, Number(targetDscr) || 0);
  if (target <= 0) return 0;

  const dscrLo = dscrAtHomePrice(25_000, state, base);
  if (dscrLo == null || dscrLo < target) return 0;

  return binarySearchMaxPrice((price) => {
    const d = dscrAtHomePrice(price, state, base);
    return d != null && d >= target;
  });
}

/** Binary search: max purchase price whose modeled monthly cash flow ≥ target. */
export function maxHomePriceForTargetCashFlow(
  targetCashFlowMonthly: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  const target = Number(targetCashFlowMonthly);
  if (!Number.isFinite(target)) return 0;
  if (cashFlowAtHomePrice(25_000, state, base) < target) return 0;
  return binarySearchMaxPrice((price) => cashFlowAtHomePrice(price, state, base) >= target);
}

/** Binary search: max purchase price whose cash-on-cash ≥ target (% as decimal ratio). */
export function maxHomePriceForTargetCashOnCash(
  targetCashOnCashPercent: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  const target = Math.max(0, Number(targetCashOnCashPercent) || 0) / 100;
  if (target <= 0) return 0;
  if (cashOnCashAtHomePrice(25_000, state, base) < target) return 0;
  return binarySearchMaxPrice((price) => cashOnCashAtHomePrice(price, state, base) >= target);
}

/** Binary search: max purchase price whose total housing payment ≤ target. */
export function maxHomePriceForTargetPayment(
  targetPaymentMonthly: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  const target = Math.max(0, Number(targetPaymentMonthly) || 0);
  if (target <= 0) return 0;
  if (paymentAtHomePrice(25_000, state, base) > target) return 0;
  return binarySearchMaxPrice((price) => paymentAtHomePrice(price, state, base) <= target);
}

export function housingBudgetBaseParams(state: AppPersisted): Omit<HousingPaymentAtPriceParams, "homePrice"> {
  return {
    downPaymentPercent: state.downPaymentPercent,
    interestRateApr: state.interestRateApr,
    termYears: state.termYears,
    propertyTaxPercent: state.propertyTaxPercent,
    insuranceAnnual: state.insuranceAnnual,
    hoaMonthly: state.hoaMonthly,
    explicitPmiMonthly: state.pmiMonthly,
  };
}

/** Derived max-offer outputs — computed on read, never written back to storage. */
export function computeMaxOfferOutputs(state: AppPersisted): MaxOfferOutputs {
  const base = housingBudgetBaseParams(state);
  const targets = readOfferTargets(state);

  const fromDti28Pct =
    state.annualGrossIncome > 0
      ? maxHomePriceForHousingBudget((state.annualGrossIncome / 12) * 0.28, base)
      : 0;

  const budget = Math.max(0, Math.round(Number(state.customHousingBudgetMonthly) || 0));
  const fromCustomHousingBudget = budget > 0 ? maxHomePriceForHousingBudget(budget, base) : 0;

  const fromTargetDscr =
    targets?.targetDscr != null && targets.targetDscr > 0
      ? maxHomePriceForTargetDscr(targets.targetDscr, state, base)
      : 0;

  const fromTargetCashFlow =
    targets?.targetCashFlowMonthly != null
      ? maxHomePriceForTargetCashFlow(targets.targetCashFlowMonthly, state, base)
      : 0;

  const fromTargetCashOnCash =
    targets?.targetCashOnCashPercent != null && targets.targetCashOnCashPercent > 0
      ? maxHomePriceForTargetCashOnCash(targets.targetCashOnCashPercent, state, base)
      : 0;

  const fromTargetPayment =
    targets?.targetPaymentMonthly != null && targets.targetPaymentMonthly > 0
      ? maxHomePriceForTargetPayment(targets.targetPaymentMonthly, state, base)
      : 0;

  const candidates = [
    fromDti28Pct,
    fromCustomHousingBudget,
    fromTargetDscr,
    fromTargetCashFlow,
    fromTargetCashOnCash,
    fromTargetPayment,
  ].filter((n) => n > 0);

  return {
    fromDti28Pct,
    fromCustomHousingBudget,
    fromTargetDscr,
    fromTargetCashFlow,
    fromTargetCashOnCash,
    fromTargetPayment,
    targets,
    bindingCap: candidates.length > 0 ? Math.min(...candidates) : 0,
  };
}
