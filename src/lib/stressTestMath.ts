import type { AppPersisted, StressTestDeltasPersisted } from "../storage/mortgageState";
import { deriveScenario } from "./deriveScenario";

export type StressMetricSnapshot = {
  paymentMonthly: number;
  cashFlowMonthly: number;
  cashOnCash: number;
  dscr: number | null;
  noiAnnual: number;
  capRate: number;
};

export type StressTestComparison = {
  baseline: StressMetricSnapshot;
  stressed: StressMetricSnapshot;
  deltas: StressTestDeltasPersisted;
};

function clampDelta(n: number | undefined, min: number, max: number): number {
  if (n === undefined || n === null || !Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function applyPctDelta(base: number, deltaPct: number): number {
  if (deltaPct === 0) return base;
  return Math.max(0, base * (1 + deltaPct / 100));
}

function applyPointsDelta(base: number, deltaPts: number, max = 100): number {
  return Math.min(max, Math.max(0, base + deltaPts));
}

/** Read optional stress deltas persisted on the scenario (never derived results). */
export function readStressTestDeltas(state: AppPersisted): StressTestDeltasPersisted | null {
  const raw = (state as Record<string, unknown>).stressTestDeltas;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: StressTestDeltasPersisted = {};
  const fields: (keyof StressTestDeltasPersisted)[] = [
    "rateDeltaPct",
    "rentDeltaPct",
    "vacancyDeltaPct",
    "appreciationDeltaPct",
    "expenseDeltaPct",
    "homePriceDeltaPct",
  ];
  for (const key of fields) {
    if (o[key] === undefined || o[key] === null) continue;
    const n = Number(o[key]);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Apply persisted stress deltas to a scenario copy (does not mutate input). */
export function applyStressDeltas(
  state: AppPersisted,
  deltas: StressTestDeltasPersisted
): AppPersisted {
  const rateDelta = clampDelta(deltas.rateDeltaPct, -10, 10);
  const rentDelta = clampDelta(deltas.rentDeltaPct, -50, 50);
  const vacancyDelta = clampDelta(deltas.vacancyDeltaPct, -50, 50);
  const appreciationDelta = clampDelta(deltas.appreciationDeltaPct, -10, 10);
  const expenseDelta = clampDelta(deltas.expenseDeltaPct, -50, 50);
  const priceDelta = clampDelta(deltas.homePriceDeltaPct, -50, 50);

  const homePrice = applyPctDelta(state.homePrice, priceDelta);
  const downPct = state.downPaymentPercent;
  const downPayment = homePrice > 0 ? Math.round((homePrice * downPct) / 100) : state.downPayment;
  const propertyTaxAnnual =
    homePrice > 0
      ? Math.round((homePrice * state.propertyTaxPercent) / 100)
      : state.propertyTaxAnnual;

  return {
    ...state,
    homePrice: Math.round(homePrice),
    downPayment,
    propertyTaxAnnual,
    interestRateApr: applyPointsDelta(state.interestRateApr, rateDelta, 30),
    monthlyRent: Math.round(applyPctDelta(state.monthlyRent, rentDelta)),
    otherMonthlyIncome: Math.round(applyPctDelta(state.otherMonthlyIncome, rentDelta)),
    vacancyRatePercent: applyPointsDelta(state.vacancyRatePercent, vacancyDelta),
    sellAnnualAppreciationPercent: applyPointsDelta(
      state.sellAnnualAppreciationPercent,
      appreciationDelta,
      30
    ),
    propertyMgmtPercent: applyPointsDelta(
      applyPctDelta(state.propertyMgmtPercent, expenseDelta),
      0
    ),
    maintenancePercent: applyPointsDelta(
      applyPctDelta(state.maintenancePercent, expenseDelta),
      0
    ),
    capexPercent: applyPointsDelta(applyPctDelta(state.capexPercent, expenseDelta), 0),
  };
}

function snapshotFromState(state: AppPersisted): StressMetricSnapshot {
  const derived = deriveScenario(state);
  const rental = derived.rental;
  const payment = derived.monthlyPayment;
  return {
    paymentMonthly: payment.total,
    cashFlowMonthly: rental.cashFlowMonthly,
    cashOnCash: rental.cashOnCash,
    dscr: rental.dscr,
    noiAnnual: rental.noiAnnual,
    capRate: rental.capRate,
  };
}

/** Compare baseline vs stressed metrics through deriveScenario on scenario copies. */
export function computeStressTestComparison(
  state: AppPersisted,
  deltas?: StressTestDeltasPersisted | null
): StressTestComparison {
  const applied = deltas ?? readStressTestDeltas(state) ?? {};
  const hasAnyDelta = Object.values(applied).some((v) => v !== undefined && v !== 0);
  const stressedState = hasAnyDelta ? applyStressDeltas(state, applied) : state;
  return {
    baseline: snapshotFromState(state),
    stressed: snapshotFromState(stressedState),
    deltas: applied,
  };
}
