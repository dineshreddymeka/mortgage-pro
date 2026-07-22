import type { AppPersisted } from "../storage/mortgageState";
import { formatHouseId, houseLabel } from "../storage/firestoreProperties";
import { deriveScenario } from "./deriveScenario";

export type HouseComparisonRow = {
  id: string;
  houseNumber: number;
  houseId: string;
  label: string;
  homePrice: number;
  downPayment: number;
  rateApr: number;
  paymentMonthly: number;
  cashInvested: number;
  rentMonthly: number;
  cashFlowMonthly: number;
  cashOnCash: number;
  dscr: number | null;
  grossRentMultiplier: number | null;
  onePercentRuleRatio: number | null;
};

export function buildHouseComparisonRow(
  id: string,
  houseNumber: number,
  scenario: AppPersisted,
  houseId?: string,
  name?: string
): HouseComparisonRow {
  const derived = deriveScenario(scenario);
  const payment = derived.monthlyPayment;
  const rental = derived.rental;
  const resolvedId = houseId ?? formatHouseId(houseNumber);
  const label =
    typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : houseLabel(resolvedId);

  return {
    id,
    houseNumber,
    houseId: resolvedId,
    label,
    homePrice: Math.max(0, scenario.homePrice),
    downPayment: Math.max(0, scenario.downPayment),
    rateApr: scenario.interestRateApr,
    paymentMonthly: payment.total,
    cashInvested: rental.initialCashInvested,
    rentMonthly: Math.max(0, scenario.monthlyRent),
    cashFlowMonthly: rental.cashFlowMonthly,
    cashOnCash: rental.cashOnCash,
    dscr: rental.dscr,
    grossRentMultiplier: rental.grossRentMultiplier,
    onePercentRuleRatio: rental.onePercentRuleRatio,
  };
}

export type ComparisonMetricKey =
  | "homePrice"
  | "paymentMonthly"
  | "cashInvested"
  | "rentMonthly"
  | "cashFlowMonthly"
  | "cashOnCash"
  | "dscr"
  | "grossRentMultiplier"
  | "onePercentRuleRatio";

/** Lower is better for cost metrics; higher is better for income/yield. */
export function isBetterMetric(
  key: ComparisonMetricKey,
  value: number,
  other: number
): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(other)) return false;
  if (Math.abs(value - other) < 1e-9) return false;
  if (
    key === "paymentMonthly" ||
    key === "cashInvested" ||
    key === "homePrice" ||
    key === "grossRentMultiplier"
  ) {
    return value < other;
  }
  return value > other;
}

export function bestHouseIdForMetric(
  rows: HouseComparisonRow[],
  key: ComparisonMetricKey
): string | null {
  const eligible = rows.filter((r) => {
    const v = r[key];
    return typeof v === "number" && Number.isFinite(v);
  });
  if (eligible.length < 2) return null;
  let best = eligible[0]!;
  for (const row of eligible.slice(1)) {
    const value = row[key] as number;
    const bestValue = best[key] as number;
    if (isBetterMetric(key, value, bestValue)) best = row;
  }
  const bestValue = best[key] as number;
  const allSame = eligible.every((r) => Math.abs((r[key] as number) - bestValue) < 1e-9);
  return allSame ? null : best.id;
}

export function comparisonMetricValue(row: HouseComparisonRow, key: ComparisonMetricKey): number | null {
  const v = row[key];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}
