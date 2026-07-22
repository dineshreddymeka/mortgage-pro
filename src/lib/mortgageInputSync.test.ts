import { describe, expect, it } from "vitest";
import {
  computeMonthlyCarryingCosts,
  formatCounterpartHelper,
  formatNumberField,
  formatPercentField,
  parseNumericInput,
  shouldShowPmiField,
  syncDownPaymentDollarPatch,
  syncDownPaymentPercentPatch,
  syncHomePricePatch,
  syncPropertyTaxAnnualPatch,
  syncPropertyTaxPercentPatch,
} from "./mortgageInputSync";

describe("mortgageInputSync", () => {
  it("formats numeric and percent fields", () => {
    expect(formatNumberField(500000)).toBe("500000");
    expect(formatNumberField(Number.NaN)).toBe("");
    expect(formatPercentField(20.126)).toBe("20.13");
    expect(formatPercentField(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("parses numeric input stripping non-digits", () => {
    expect(parseNumericInput("$1,250.5")).toBe(1250.5);
    expect(parseNumericInput("abc")).toBeNull();
  });

  it("syncHomePricePatch keeps down and tax percentages", () => {
    expect(syncHomePricePatch(400_000, 20, 1.2)).toEqual({
      homePrice: 400_000,
      downPayment: 80_000,
      propertyTaxAnnual: 4_800,
    });
  });

  it("syncDownPaymentDollarPatch caps at home price and updates percent", () => {
    expect(syncDownPaymentDollarPatch(90_000, 400_000)).toEqual({
      downPayment: 90_000,
      downPaymentPercent: 22.5,
    });
    expect(syncDownPaymentDollarPatch(500_000, 400_000)).toEqual({
      downPayment: 400_000,
      downPaymentPercent: 100,
    });
    expect(syncDownPaymentDollarPatch(50_000, 0)).toEqual({
      downPayment: 50_000,
      downPaymentPercent: 0,
    });
  });

  it("syncDownPaymentPercentPatch derives dollars from purchase price", () => {
    expect(syncDownPaymentPercentPatch(25, 400_000, 0)).toEqual({
      downPaymentPercent: 25,
      downPayment: 100_000,
    });
    expect(syncDownPaymentPercentPatch(15, 0, 75_000)).toEqual({
      downPaymentPercent: 15,
      downPayment: 75_000,
    });
  });

  it("syncPropertyTaxAnnualPatch and percent patch stay dual-written", () => {
    expect(syncPropertyTaxAnnualPatch(6_000, 500_000)).toEqual({
      propertyTaxAnnual: 6_000,
      propertyTaxPercent: 1.2,
    });
    expect(syncPropertyTaxPercentPatch(1.5, 400_000, 999)).toEqual({
      propertyTaxPercent: 1.5,
      propertyTaxAnnual: 6_000,
    });
    expect(syncPropertyTaxPercentPatch(2, 0, 4_000)).toEqual({
      propertyTaxPercent: 2,
      propertyTaxAnnual: 4_000,
    });
  });

  it("shouldShowPmiField when down is low or PMI is nonzero", () => {
    expect(shouldShowPmiField(15, 0, 500_000, 75_000)).toBe(true);
    expect(shouldShowPmiField(25, 120, 500_000, 125_000)).toBe(true);
    expect(shouldShowPmiField(25, 0, 500_000, 125_000)).toBe(false);
  });

  it("computeMonthlyCarryingCosts sums tax, insurance, HOA, and conditional PMI", () => {
    const costs = computeMonthlyCarryingCosts({
      propertyTaxAnnual: 6_000,
      insuranceAnnual: 1_200,
      hoaMonthly: 50,
      pmiMonthly: 180,
      downPaymentPercent: 10,
      homePrice: 500_000,
      downPayment: 50_000,
    });
    expect(costs.propertyTaxMonthly).toBe(500);
    expect(costs.insuranceMonthly).toBe(100);
    expect(costs.hoaMonthly).toBe(50);
    expect(costs.pmiMonthly).toBe(180);
    expect(costs.totalMonthly).toBe(830);
  });

  it("formatCounterpartHelper shows percent in dollar mode and dollars in percent mode", () => {
    expect(formatCounterpartHelper("dollar", 500_000, 100_000, 20)).toMatch(/20% of purchase price/);
    expect(formatCounterpartHelper("percent", 500_000, 100_000, 20)).toMatch(/\$100,000/);
    expect(formatCounterpartHelper("dollar", 0, 100, 20)).toBeUndefined();
  });
});
