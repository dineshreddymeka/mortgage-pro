import { describe, expect, it } from "vitest";
import { buildRateSchedule, buydownOffsets, computeLoanProduct, miForMonth } from "./loanProducts";

describe("loanProducts", () => {
  it("conventional PMI when LTV > 80%", () => {
    const r = computeLoanProduct({ productType: "conventional", homePrice: 400_000, downPayment: 40_000, noteApr: 6.5, termYears: 30 });
    expect(r.miMonthly).toBeGreaterThan(0);
  });
  it("FHA finances UFMIP", () => {
    const r = computeLoanProduct({ productType: "fha", homePrice: 400_000, downPayment: 14_000, noteApr: 6.25, termYears: 30, financeUpfrontFees: true });
    expect(r.totalLoanAmount).toBeGreaterThan(r.baseLoanAmount);
  });
  it("2-1 buydown", () => {
    const s = buildRateSchedule(6.5, 30, "fixed", "2-1");
    expect(s[0]).toBeCloseTo(4.5, 5);
    expect(buydownOffsets("2-1")).toEqual([2, 1]);
  });
  it("PMI drop", () => {
    expect(miForMonth(280_000, 360_000, 180, 0.78, null, 61)).toBe(0);
  });
});
