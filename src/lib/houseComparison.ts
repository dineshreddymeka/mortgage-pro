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
  };
}

export type ComparisonMetricKey =
  | "homePrice"
  | "paymentMonthly"
  | "cashInvested"
  | "rentMonthly"
  | "cashFlowMonthly"
  | "cashOnCash";

/** Lower is better for cost metrics; higher is better for income/yield. */
export function isBetterMetric(
  key: ComparisonMetricKey,
  value: number,
  other: number
): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(other)) return false;
  if (Math.abs(value - other) < 1e-9) return false;
  if (key === "paymentMonthly" || key === "cashInvested" || key === "homePrice") {
    return value < other;
  }
  return value > other;
}

export function bestHouseIdForMetric(
  rows: HouseComparisonRow[],
  key: ComparisonMetricKey
): string | null {
  if (rows.length < 2) return null;
  let best = rows[0];
  for (const row of rows.slice(1)) {
    if (isBetterMetric(key, row[key], best[key])) best = row;
  }
  // Only highlight if not a complete tie across all
  const allSame = rows.every((r) => Math.abs(r[key] - best[key]) < 1e-9);
  return allSame ? null : best.id;
}
