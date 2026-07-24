import {
  computeBrrrrCashLeft,
  computeFlipProceeds,
  type BrrrrInput,
  type BrrrrResult,
  type FlipInput,
  type FlipResult,
} from "./dealStrategies";
import type { AppPersisted, BrrrrStrategyPersisted, DealStrategyPersisted, FlipStrategyPersisted } from "../storage/mortgageState";
import { resolveLoanProduct } from "./resolveLoanScenario";

export type DealStrategySnapshots = {
  brrrr: BrrrrResult | null;
  flip: FlipResult | null;
};

function num(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function rehabFromScenario(state: AppPersisted): number {
  return Math.max(0, Math.round(num(state.upfront?.rehabCashIn ?? state.rehabCashIn, 0)));
}

/** Build BRRRR primitive input from scenario + optional persisted overrides. */
export function buildBrrrrInput(state: AppPersisted, overrides?: BrrrrStrategyPersisted): BrrrrInput | null {
  if (!overrides) return null;
  const hp = Math.max(0, num(state.homePrice));
  const dp = Math.max(0, num(state.downPayment));
  const lp = resolveLoanProduct(state);
  const initialLoan = Math.max(0, num(lp.totalLoanAmount));
  const arv = Math.max(0, num(overrides.arv));
  if (hp <= 0 && arv <= 0) return null;

  return {
    purchasePrice: hp,
    rehabCost: rehabFromScenario(state),
    buyClosingCosts: Math.max(0, Math.round(num(state.closingCosts))),
    holdingCostsDuringRehab: Math.max(0, Math.round(num(overrides.holdingCostsDuringRehab))),
    downPayment: dp,
    initialLoanAmount: initialLoan,
    arv,
    refiLtvPercent: clampPct(num(overrides.refiLtvPercent ?? 75)),
    refiClosingCosts: Math.max(0, Math.round(num(overrides.refiClosingCosts))),
  };
}

/** Build flip primitive input from scenario + optional persisted overrides. */
export function buildFlipInput(state: AppPersisted, overrides?: FlipStrategyPersisted): FlipInput | null {
  if (!overrides) return null;
  const hp = Math.max(0, num(state.homePrice));
  const salePrice = Math.max(0, num(overrides.salePrice));
  if (hp <= 0 && salePrice <= 0) return null;

  const lp = resolveLoanProduct(state);
  return {
    purchasePrice: hp,
    rehabCost: rehabFromScenario(state),
    buyClosingCosts: Math.max(0, Math.round(num(state.closingCosts))),
    holdingCosts: Math.max(0, Math.round(num(overrides.holdingCosts))),
    financingCosts: Math.max(0, Math.round(num(overrides.financingCosts ?? 0))),
    salePrice,
    sellingCostPercent: clampPct(num(overrides.sellingCostPercent ?? 6)),
    loanPayoffAtSale: Math.max(
      0,
      Math.round(num(overrides.loanPayoffAtSale ?? lp.totalLoanAmount))
    ),
  };
}

/** Derived BRRRR / flip snapshots — never persisted. */
export function resolveDealStrategySnapshots(
  state: AppPersisted,
  dealStrategy?: DealStrategyPersisted
): DealStrategySnapshots {
  const block = dealStrategy ?? state.dealStrategy;
  const brrrrInput = buildBrrrrInput(state, block?.brrrr);
  const flipInput = buildFlipInput(state, block?.flip);
  return {
    brrrr: brrrrInput ? computeBrrrrCashLeft(brrrrInput) : null,
    flip: flipInput ? computeFlipProceeds(flipInput) : null,
  };
}

export function hasBrrrrInputs(block?: BrrrrStrategyPersisted): boolean {
  if (!block) return false;
  return (
    num(block.arv) > 0 ||
    num(block.refiLtvPercent) > 0 ||
    num(block.refiClosingCosts) > 0 ||
    num(block.holdingCostsDuringRehab) > 0
  );
}

export function hasFlipInputs(block?: FlipStrategyPersisted): boolean {
  if (!block) return false;
  return (
    num(block.salePrice) > 0 ||
    num(block.holdingCosts) > 0 ||
    num(block.financingCosts) > 0 ||
    num(block.loanPayoffAtSale) > 0 ||
    (block.sellingCostPercent !== undefined && num(block.sellingCostPercent) !== 6)
  );
}

export function hasDealStrategyInputs(block?: DealStrategyPersisted): boolean {
  if (!block) return false;
  return hasBrrrrInputs(block.brrrr) || hasFlipInputs(block.flip);
}
