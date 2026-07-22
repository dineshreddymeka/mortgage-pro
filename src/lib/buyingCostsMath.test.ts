import { describe, expect, it } from "vitest";
import {
  applyBuyerCostLineOverrides,
  estimateHomeBuyingOneTimeCosts,
} from "./buyingCostsMath";

describe("buyingCostsMath", () => {
  it("estimateHomeBuyingOneTimeCosts returns fee and prepaid lines", () => {
    const est = estimateHomeBuyingOneTimeCosts({
      homePrice: 400_000,
      loanAmount: 320_000,
      propertyTaxAnnual: 4800,
      insuranceAnnual: 1200,
      hoaMonthly: 0,
    });
    expect(est.lines.length).toBeGreaterThan(3);
    expect(est.suggestedClosingTotal).toBe(est.feesSubtotal + est.prepaidsSubtotal);
  });

  it("applyBuyerCostLineOverrides replaces modeled amounts", () => {
    const est = estimateHomeBuyingOneTimeCosts({
      homePrice: 400_000,
      loanAmount: 320_000,
      propertyTaxAnnual: 4800,
      insuranceAnnual: 1200,
      hoaMonthly: 0,
    });
    const overridden = applyBuyerCostLineOverrides(est, { appraisal: 900 });
    const appraisal = overridden.lines.find((l) => l.id === "appraisal");
    expect(appraisal?.amount).toBe(900);
    expect(overridden.suggestedClosingTotal).toBeGreaterThan(est.suggestedClosingTotal);
  });
});
