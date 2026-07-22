import { describe, expect, it } from "vitest";
import { applyBuyerCostLineOverrides, computeNetCashToClose, estimateHomeBuyingOneTimeCosts } from "./buyingCostsMath";

describe("buyingCostsMath", () => {
  it("estimateHomeBuyingOneTimeCosts returns fee and prepaid lines", () => {
    const est = estimateHomeBuyingOneTimeCosts({ homePrice: 400_000, loanAmount: 320_000, propertyTaxAnnual: 4800, insuranceAnnual: 1200, hoaMonthly: 0 });
    expect(est.suggestedClosingTotal).toBe(est.feesSubtotal + est.prepaidsSubtotal);
  });
  it("applyBuyerCostLineOverrides replaces modeled amounts", () => {
    const est = estimateHomeBuyingOneTimeCosts({ homePrice: 400_000, loanAmount: 320_000, propertyTaxAnnual: 4800, insuranceAnnual: 1200, hoaMonthly: 0 });
    expect(applyBuyerCostLineOverrides(est, { appraisal: 900 }).lines.find(l => l.id === "appraisal")?.amount).toBe(900);
  });
  it("computeNetCashToClose applies credits", () => {
    const net = computeNetCashToClose(80_000, 8000, 2000, { earnestMoney: 5000, sellerCredit: 3000, rehabCashIn: 10000 });
    expect(net.netCashToClose).toBe(80_000 + 8000 + 2000 + 10000 - 5000 - 3000);
  });
  it("scales fees by location multiplier", () => {
    const base = estimateHomeBuyingOneTimeCosts({ homePrice: 400_000, loanAmount: 320_000, propertyTaxAnnual: 4800, insuranceAnnual: 1200, hoaMonthly: 0 });
    const high = estimateHomeBuyingOneTimeCosts({ homePrice: 400_000, loanAmount: 320_000, propertyTaxAnnual: 4800, insuranceAnnual: 1200, hoaMonthly: 0, closingCostMultiplier: 1.2 });
    expect(high.suggestedClosingTotal).toBeGreaterThan(base.suggestedClosingTotal);
  });
});
