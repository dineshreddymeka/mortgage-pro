import type { AppPersisted } from "../storage/mortgageState";

export function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

export function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function parseNumericInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function clampPercent(value: number, max = 100): number {
  return Math.min(max, Math.max(0, value));
}

export function syncHomePricePatch(
  homePrice: number,
  downPaymentPercent: number,
  propertyTaxPercent: number
): Pick<AppPersisted, "homePrice" | "downPayment" | "propertyTaxAnnual"> {
  const hp = Math.max(0, homePrice);
  return {
    homePrice: hp,
    downPayment: Math.round((hp * downPaymentPercent) / 100),
    propertyTaxAnnual: Math.round((hp * propertyTaxPercent) / 100),
  };
}

export function syncDownPaymentDollarPatch(
  downPayment: number,
  homePrice: number
): Pick<AppPersisted, "downPayment" | "downPaymentPercent"> {
  const hp = homePrice;
  const dp = Math.max(0, downPayment);
  const capped = hp > 0 ? Math.min(dp, hp) : dp;
  return {
    downPayment: capped,
    downPaymentPercent: hp > 0 ? (capped / hp) * 100 : 0,
  };
}

export function syncDownPaymentPercentPatch(
  percent: number,
  homePrice: number,
  currentDownPayment: number
): Pick<AppPersisted, "downPayment" | "downPaymentPercent"> {
  const pct = clampPercent(percent);
  const hp = homePrice;
  return {
    downPaymentPercent: pct,
    downPayment: hp > 0 ? Math.round((hp * pct) / 100) : currentDownPayment,
  };
}

export function syncPropertyTaxAnnualPatch(
  propertyTaxAnnual: number,
  homePrice: number
): Pick<AppPersisted, "propertyTaxAnnual" | "propertyTaxPercent"> {
  const hp = homePrice;
  const annual = Math.max(0, propertyTaxAnnual);
  return {
    propertyTaxAnnual: annual,
    propertyTaxPercent: hp > 0 ? (annual / hp) * 100 : 0,
  };
}

export function syncPropertyTaxPercentPatch(
  percent: number,
  homePrice: number,
  currentPropertyTaxAnnual: number
): Pick<AppPersisted, "propertyTaxAnnual" | "propertyTaxPercent"> {
  const pct = clampPercent(percent);
  const hp = homePrice;
  return {
    propertyTaxPercent: pct,
    propertyTaxAnnual: hp > 0 ? Math.round((hp * pct) / 100) : currentPropertyTaxAnnual,
  };
}

export type MonthlyCarryingCosts = {
  propertyTaxMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  pmiMonthly: number;
  totalMonthly: number;
};

export function shouldShowPmiField(downPaymentPercent: number, pmiMonthly: number, homePrice: number, downPayment: number): boolean {
  if (pmiMonthly > 0) return true;
  return downPaymentPercent < 20 && homePrice > downPayment;
}

export function computeMonthlyCarryingCosts(state: Pick<
  AppPersisted,
  "propertyTaxAnnual" | "insuranceAnnual" | "hoaMonthly" | "pmiMonthly" | "downPaymentPercent" | "homePrice" | "downPayment"
>): MonthlyCarryingCosts {
  const propertyTaxMonthly = Math.max(0, state.propertyTaxAnnual) / 12;
  const insuranceMonthly = Math.max(0, state.insuranceAnnual) / 12;
  const hoaMonthly = Math.max(0, state.hoaMonthly);
  const includePmi = shouldShowPmiField(state.downPaymentPercent, state.pmiMonthly, state.homePrice, state.downPayment);
  const pmiMonthly = includePmi ? Math.max(0, state.pmiMonthly) : 0;
  return {
    propertyTaxMonthly,
    insuranceMonthly,
    hoaMonthly,
    pmiMonthly,
    totalMonthly: propertyTaxMonthly + insuranceMonthly + hoaMonthly + pmiMonthly,
  };
}

export function formatCounterpartHelper(
  mode: "dollar" | "percent",
  basis: number,
  dollarValue: number,
  percentValue: number,
  options?: { dollarSuffix?: string; percentLabel?: string }
): string | undefined {
  if (basis <= 0) return undefined;
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const pct = formatPercentField(percentValue);
  const dollarSuffix = options?.dollarSuffix ?? "";
  const percentLabel = options?.percentLabel ?? "purchase price";
  if (mode === "dollar") {
    return `${pct}% of ${percentLabel}`;
  }
  return `${money.format(Math.round(dollarValue))}${dollarSuffix}`;
}
