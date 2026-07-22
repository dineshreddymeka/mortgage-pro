import type { AppPersisted, LoanScenarioPersisted } from "../storage/mortgageState";
import { computeLoanProduct, type LoanProductInput, type LoanProductResult } from "./loanProducts";

export function resolveLoanProductInput(state: AppPersisted): LoanProductInput {
  const loan: LoanScenarioPersisted | undefined = state.loan;
  const miOverride = state.pmiMonthly > 0 && loan?.useScenarioPmi !== false ? state.pmiMonthly : loan?.miMonthlyOverride;
  return {
    productType: loan?.productType ?? "conventional",
    homePrice: Math.max(0, state.homePrice),
    downPayment: Math.max(0, state.downPayment),
    noteApr: loan?.noteApr ?? state.interestRateApr,
    termYears: loan?.termYears ?? state.termYears,
    rateType: loan?.rateType ?? "fixed",
    arm: loan?.arm,
    pointsPercent: loan?.pointsPercent,
    buydown: loan?.buydown ?? "none",
    financeUpfrontFees: loan?.financeUpfrontFees ?? false,
    vaFirstUse: loan?.vaFirstUse,
    miMonthlyOverride: miOverride,
  };
}

export function resolveLoanProduct(state: AppPersisted): LoanProductResult {
  return computeLoanProduct(resolveLoanProductInput(state));
}

export function resolveUpfrontAdjustments(state: AppPersisted, pointsUpfrontCost = 0) {
  const u = state.upfront;
  return {
    earnestMoney: Math.max(0, Math.round(u?.earnestMoney ?? state.earnestMoney ?? 0)),
    sellerCredit: Math.max(0, Math.round(u?.sellerCredit ?? state.sellerCredit ?? 0)),
    lenderCredit: Math.max(0, Math.round(u?.lenderCredit ?? state.lenderCredit ?? 0)),
    rehabCashIn: Math.max(0, Math.round(u?.rehabCashIn ?? state.rehabCashIn ?? 0)),
    pointsUpfrontCost: Math.max(0, Math.round(pointsUpfrontCost)),
  };
}
