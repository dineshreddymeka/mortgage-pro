import type { AppPersisted, RentVsBuyAssumptionsPersisted } from "../storage/mortgageState";
import { deriveScenario } from "./deriveScenario";

export type RentVsBuyResult = {
  horizonYears: number;
  comparableRentMonthly: number;
  investmentReturnPercent: number;
  /** Net position after horizon if you buy (equity + cumulative operating cash flow). */
  buyNetWealth: number;
  /** Net portfolio after horizon if you rent and invest the same upfront cash. */
  rentNetWealth: number;
  /** buyNetWealth − rentNetWealth (positive favors buying). */
  advantageBuy: number;
  /** First whole year where buy cumulative wealth exceeds rent, or null within horizon. */
  breakEvenYear: number | null;
  initialCashInvested: number;
  buyCumulativeCashFlow: number;
  buyEndingEquity: number;
};

function clampHorizonYears(n: number): number {
  if (!Number.isFinite(n)) return 7;
  return Math.min(30, Math.max(1, Math.round(n)));
}

function rentForMonth(baseRent: number, rentGrowthPct: number, month: number): number {
  const yearsElapsed = Math.floor((month - 1) / 12);
  if (yearsElapsed <= 0) return baseRent;
  return baseRent * (1 + rentGrowthPct / 100) ** yearsElapsed;
}

/** Read optional rent-vs-buy assumptions persisted on the scenario (never derived results). */
export function readRentVsBuyAssumptions(state: AppPersisted): RentVsBuyAssumptionsPersisted | null {
  const raw = (state as Record<string, unknown>).rentVsBuy;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: RentVsBuyAssumptionsPersisted = {};
  if (o.comparableRentMonthly !== undefined && o.comparableRentMonthly !== null) {
    const n = Number(o.comparableRentMonthly);
    if (Number.isFinite(n) && n >= 0) out.comparableRentMonthly = Math.round(n);
  }
  if (o.investmentReturnPercent !== undefined && o.investmentReturnPercent !== null) {
    const n = Number(o.investmentReturnPercent);
    if (Number.isFinite(n) && n >= 0) out.investmentReturnPercent = Math.min(30, n);
  }
  if (o.horizonYears !== undefined && o.horizonYears !== null) {
    const n = Number(o.horizonYears);
    if (Number.isFinite(n) && n > 0) out.horizonYears = clampHorizonYears(n);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Compare buying (modeled rental hold) vs renting a comparable home and investing upfront cash.
 * Uses `deriveScenario` / monthly projection for the buy path.
 */
export function computeRentVsBuy(
  state: AppPersisted,
  assumptions?: RentVsBuyAssumptionsPersisted | null
): RentVsBuyResult {
  const stored = assumptions ?? readRentVsBuyAssumptions(state) ?? {};
  const horizonYears = clampHorizonYears(stored.horizonYears ?? 7);
  const months = horizonYears * 12;
  const comparableRentMonthly = Math.max(
    0,
    Math.round(
      Number(stored.comparableRentMonthly ?? state.monthlyRent) || 0
    )
  );
  const investmentReturnPercent = Math.min(
    30,
    Math.max(0, Number(stored.investmentReturnPercent ?? 5) || 0)
  );
  const rentGrowthPct = state.growth?.rentGrowthPercent ?? 0;
  const monthlyInvestReturn = investmentReturnPercent / 100 / 12;

  const derived = deriveScenario(state);
  const initialCashInvested = derived.rental.initialCashInvested;
  const projection = derived.monthlyProjection.slice(0, months);

  let buyCumulativeCashFlow = 0;
  let buyEndingEquity = 0;
  const buyWealthByYear: number[] = [0];

  for (let m = 1; m <= months; m++) {
    const row = projection[m - 1];
    if (row) {
      buyCumulativeCashFlow += row.cashFlow;
      buyEndingEquity = row.equity;
    }
    if (m % 12 === 0) {
      buyWealthByYear.push(buyCumulativeCashFlow + buyEndingEquity);
    }
  }

  const buyNetWealth = buyCumulativeCashFlow + buyEndingEquity;

  let portfolio = initialCashInvested;
  const rentWealthByYear: number[] = [portfolio];

  for (let m = 1; m <= months; m++) {
    portfolio = portfolio * (1 + monthlyInvestReturn);
    portfolio -= rentForMonth(comparableRentMonthly, rentGrowthPct, m);
    if (m % 12 === 0) rentWealthByYear.push(portfolio);
  }

  const rentNetWealth = portfolio;

  let breakEvenYear: number | null = null;
  for (let y = 1; y <= horizonYears; y++) {
    const buyW = buyWealthByYear[y] ?? buyNetWealth;
    const rentW = rentWealthByYear[y] ?? rentNetWealth;
    if (buyW > rentW) {
      breakEvenYear = y;
      break;
    }
  }

  return {
    horizonYears,
    comparableRentMonthly,
    investmentReturnPercent,
    buyNetWealth: Math.round(buyNetWealth),
    rentNetWealth: Math.round(rentNetWealth),
    advantageBuy: Math.round(buyNetWealth - rentNetWealth),
    breakEvenYear,
    initialCashInvested,
    buyCumulativeCashFlow: Math.round(buyCumulativeCashFlow),
    buyEndingEquity: Math.round(buyEndingEquity),
  };
}
