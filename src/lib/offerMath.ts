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
};

export type MaxOfferOutputs = {
  /** Max price at 28% front-end DTI housing cap (0 = none found). */
  fromDti28Pct: number;
  /** Max price for persisted/custom monthly housing budget (0 = none / unset). */
  fromCustomHousingBudget: number;
  /** Max price meeting target DSCR (0 = none / no target / no debt path). */
  fromTargetDscr: number;
  /** Target DSCR read from optional `offerTargets` (not persisted derived output). */
  targetDscr: number | null;
};

/** Read optional offer targets preserved on the scenario blob (future schema versions). */
export function readOfferTargets(state: AppPersisted): OfferTargets | null {
  const raw = (state as Record<string, unknown>).offerTargets;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const targetDscr =
    o.targetDscr !== undefined && o.targetDscr !== null ? Number(o.targetDscr) : undefined;
  if (targetDscr !== undefined && !Number.isFinite(targetDscr)) return null;
  if (targetDscr === undefined) return null;
  return { targetDscr: Math.max(0, targetDscr) };
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

/** Binary search: max purchase price whose modeled DSCR ≥ `targetDscr`. Returns 0 when none. */
export function maxHomePriceForTargetDscr(
  targetDscr: number,
  state: AppPersisted,
  base: Omit<HousingPaymentAtPriceParams, "homePrice">
): number {
  const target = Math.max(0, Number(targetDscr) || 0);
  if (target <= 0) return 0;

  let lo = 25_000;
  let hi = 20_000_000;

  const dscrHi = dscrAtHomePrice(hi, state, base);
  if (dscrHi != null && dscrHi >= target) return hi;

  const dscrLo = dscrAtHomePrice(lo, state, base);
  if (dscrLo == null || dscrLo < target) return 0;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const d = dscrAtHomePrice(mid, state, base);
    if (d == null || d < target) hi = mid;
    else lo = mid;
  }
  return Math.round(lo);
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
  const targetDscr = targets?.targetDscr ?? null;

  const fromDti28Pct =
    state.annualGrossIncome > 0
      ? maxHomePriceForHousingBudget((state.annualGrossIncome / 12) * 0.28, base)
      : 0;

  const budget = Math.max(0, Math.round(Number(state.customHousingBudgetMonthly) || 0));
  const fromCustomHousingBudget = budget > 0 ? maxHomePriceForHousingBudget(budget, base) : 0;

  const fromTargetDscr =
    targetDscr != null && targetDscr > 0 ? maxHomePriceForTargetDscr(targetDscr, state, base) : 0;

  return {
    fromDti28Pct,
    fromCustomHousingBudget,
    fromTargetDscr,
    targetDscr,
  };
}
