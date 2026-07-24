import type { AppPersisted } from "../../storage/mortgageState";

/**
 * Canonical shared fields edited on Common Inputs (not credits, OpEx, or sale terms).
 * Specialized tabs remain authoritative for their own domains.
 */
export const COMMON_INPUT_FIELD_KEYS = [
  "homePrice",
  "downPayment",
  "downPaymentPercent",
  "interestRateApr",
  "termYears",
  "propertyTaxAnnual",
  "propertyTaxPercent",
  "insuranceAnnual",
  "hoaMonthly",
  "pmiMonthly",
  "extraPrincipalMonthly",
  "closingCosts",
  "miscInitialCash",
] as const satisfies readonly (keyof AppPersisted)[];

export type CommonInputFieldKey = (typeof COMMON_INPUT_FIELD_KEYS)[number];

export type CommonCashInvestedSummary = {
  downPayment: number;
  closingCosts: number;
  miscInitialCash: number;
  closingPlusMisc: number;
  /** Down + closing + misc (before credits / points adjustments). */
  grossCashIn: number;
  loanAmount: number;
  netCashToClose: number;
};

/**
 * Compact cash-invested snapshot for the Common Inputs board.
 * Prefer `loanAmount` / `netCashToClose` from `deriveScenario` so loan product and credits stay consistent.
 */
export function summarizeCommonCashInvested(
  state: Pick<AppPersisted, "downPayment" | "closingCosts" | "miscInitialCash">,
  derived: Pick<{ loanAmount: number; netCashToClose: number }, "loanAmount" | "netCashToClose">
): CommonCashInvestedSummary {
  const downPayment = Math.max(0, Math.round(state.downPayment || 0));
  const closingCosts = Math.max(0, Math.round(state.closingCosts || 0));
  const miscInitialCash = Math.max(0, Math.round(state.miscInitialCash || 0));
  const closingPlusMisc = closingCosts + miscInitialCash;
  return {
    downPayment,
    closingCosts,
    miscInitialCash,
    closingPlusMisc,
    grossCashIn: downPayment + closingPlusMisc,
    loanAmount: Math.max(0, Math.round(derived.loanAmount || 0)),
    netCashToClose: Math.round(derived.netCashToClose || 0),
  };
}

/** Patch helpers for closing / misc — keep non-negative integers in sync with Upfront editors. */
export function patchClosingCosts(value: number): Pick<AppPersisted, "closingCosts"> {
  return { closingCosts: Math.max(0, value) };
}

export function patchMiscInitialCash(value: number): Pick<AppPersisted, "miscInitialCash"> {
  return { miscInitialCash: Math.max(0, value) };
}
