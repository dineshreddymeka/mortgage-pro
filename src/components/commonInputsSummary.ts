import {
  computeMonthlyCarryingCosts,
  shouldShowPmiField,
} from "../lib/mortgageInputSync";
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

export type CommonInputsSummaryItem = {
  label: string;
  value: string;
  emphasize?: boolean;
};

/** Shared loan terms + carrying costs for the Financing tab summary. */
export function financingCommonSummaryItems(
  state: Pick<
    AppPersisted,
    | "homePrice"
    | "downPayment"
    | "downPaymentPercent"
    | "interestRateApr"
    | "termYears"
    | "propertyTaxAnnual"
    | "insuranceAnnual"
    | "hoaMonthly"
    | "pmiMonthly"
    | "extraPrincipalMonthly"
  >
): CommonInputsSummaryItem[] {
  const carrying = computeMonthlyCarryingCosts(state);
  const showPmi = shouldShowPmiField(
    state.downPaymentPercent,
    state.pmiMonthly,
    state.homePrice,
    state.downPayment
  );
  const items: CommonInputsSummaryItem[] = [
    { label: "Price", value: money.format(state.homePrice) },
    { label: "Down", value: `${money.format(state.downPayment)} (${state.downPaymentPercent.toFixed(1)}%)` },
    { label: "Rate · term", value: `${state.interestRateApr}% · ${state.termYears}y` },
    { label: "Tax / mo", value: moneyDec.format(carrying.propertyTaxMonthly) },
    { label: "Ins / mo", value: moneyDec.format(carrying.insuranceMonthly) },
    { label: "HOA / mo", value: moneyDec.format(carrying.hoaMonthly) },
  ];
  if (showPmi) {
    items.push({ label: "PMI / mo", value: moneyDec.format(carrying.pmiMonthly) });
  }
  items.push({
    label: "Carrying / mo",
    value: moneyDec.format(carrying.totalMonthly),
    emphasize: true,
  });
  if (state.extraPrincipalMonthly > 0) {
    items.push({
      label: "Extra principal",
      value: `${money.format(state.extraPrincipalMonthly)}/mo`,
    });
  }
  return items;
}

/** Purchase / cash-to-close fields for the Upfront tab summary. */
export function upfrontCommonSummaryItems(
  state: Pick<AppPersisted, "homePrice" | "downPayment" | "closingCosts" | "miscInitialCash">
): CommonInputsSummaryItem[] {
  const total = state.downPayment + state.closingCosts + state.miscInitialCash;
  return [
    { label: "Price", value: money.format(state.homePrice) },
    { label: "Down", value: money.format(state.downPayment) },
    { label: "Closing", value: money.format(state.closingCosts) },
    { label: "Misc", value: money.format(state.miscInitialCash) },
    { label: "Cash in", value: moneyDec.format(total), emphasize: true },
  ];
}

/** Tax / insurance / HOA carrying slice for the Rental OpEx panel. */
export function carryingCommonSummaryItems(
  state: Pick<AppPersisted, "propertyTaxAnnual" | "propertyTaxPercent" | "insuranceAnnual" | "hoaMonthly">
): CommonInputsSummaryItem[] {
  return [
    {
      label: "Tax / yr",
      value: `${money.format(state.propertyTaxAnnual)} (${state.propertyTaxPercent.toFixed(2)}%)`,
    },
    { label: "Ins / yr", value: money.format(state.insuranceAnnual) },
    { label: "HOA / mo", value: money.format(state.hoaMonthly) },
  ];
}
