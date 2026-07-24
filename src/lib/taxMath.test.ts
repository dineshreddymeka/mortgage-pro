import { describe, expect, it } from "vitest";
import {
  RESIDENTIAL_DEPRECIATION_YEARS,
  capitalGainsTax,
  compute1031Exchange,
  computeSaleTaxSummary,
  depreciation27_5,
  depreciationRecapture,
  simplifiedQbiDeduction,
  splitLandBuildingBasis,
} from "./taxMath";

describe("taxMath", () => {
  describe("splitLandBuildingBasis", () => {
    it("splits purchase price into land and building", () => {
      const b = splitLandBuildingBasis(500_000, 20);
      expect(b.landBasis).toBe(100_000);
      expect(b.buildingBasis).toBe(400_000);
      expect(b.landBasis + b.buildingBasis).toBe(b.totalBasis);
    });

    it("treats 0% land as fully depreciable building", () => {
      const b = splitLandBuildingBasis(300_000, 0);
      expect(b.landBasis).toBe(0);
      expect(b.buildingBasis).toBe(300_000);
    });
  });

  describe("depreciation27_5", () => {
    it("straight-lines over 27.5 years", () => {
      const d = depreciation27_5(275_000, 12);
      expect(d.annualDepreciation).toBeCloseTo(10_000, 0);
      expect(d.monthlyDepreciation).toBeCloseTo(10_000 / 12, 2);
      expect(d.accumulatedDepreciation).toBeCloseTo(10_000, 0);
    });

    it("caps accumulated depreciation at building basis", () => {
      const maxMonths = RESIDENTIAL_DEPRECIATION_YEARS * 12;
      const d = depreciation27_5(100_000, maxMonths + 120);
      expect(d.accumulatedDepreciation).toBeCloseTo(100_000, 0);
      expect(d.remainingBuildingBasis).toBe(0);
    });
  });

  describe("simplifiedQbiDeduction", () => {
    it("applies 20% of QBI capped by taxable income", () => {
      const r = simplifiedQbiDeduction({
        qualifiedBusinessIncome: 50_000,
        taxableIncomeBeforeQbi: 80_000,
      });
      expect(r.qbiDeduction).toBe(10_000);
    });

    it("caps at taxable income when lower than QBI", () => {
      const r = simplifiedQbiDeduction({
        qualifiedBusinessIncome: 100_000,
        taxableIncomeBeforeQbi: 30_000,
      });
      expect(r.qbiDeduction).toBe(6_000);
    });

    it("returns zero when ineligible", () => {
      const r = simplifiedQbiDeduction({
        qualifiedBusinessIncome: 40_000,
        taxableIncomeBeforeQbi: 40_000,
        isEligible: false,
      });
      expect(r.qbiDeduction).toBe(0);
    });
  });

  describe("depreciationRecapture", () => {
    it("allocates gain to recapture up to depreciation taken", () => {
      const r = depreciationRecapture({
        accumulatedDepreciation: 80_000,
        adjustedBasis: 320_000,
        salePrice: 450_000,
        sellingCostPercent: 6,
      });
      expect(r.amountRealized).toBeCloseTo(423_000, 0);
      expect(r.totalGain).toBeCloseTo(103_000, 0);
      expect(r.recaptureGain).toBeCloseTo(80_000, 0);
      expect(r.remainingCapitalGain).toBeCloseTo(23_000, 0);
      expect(r.estimatedRecaptureTax).toBeCloseTo(20_000, 0);
    });

    it("limits recapture when gain is smaller than depreciation", () => {
      const r = depreciationRecapture({
        accumulatedDepreciation: 100_000,
        adjustedBasis: 400_000,
        salePrice: 410_000,
        sellingCostPercent: 0,
      });
      expect(r.totalGain).toBe(10_000);
      expect(r.recaptureGain).toBe(10_000);
      expect(r.remainingCapitalGain).toBe(0);
    });
  });

  describe("capitalGainsTax", () => {
    it("taxes long-term gain at the provided rate", () => {
      const r = capitalGainsTax({ capitalGain: 50_000, longTermRatePercent: 15 });
      expect(r.estimatedTax).toBe(7_500);
    });

    it("uses short-term rate when not long-term", () => {
      const r = capitalGainsTax({
        capitalGain: 10_000,
        shortTermRatePercent: 32,
        isLongTerm: false,
      });
      expect(r.estimatedTax).toBe(3_200);
    });
  });

  describe("compute1031Exchange", () => {
    it("defers all gain when boot is zero", () => {
      const r = compute1031Exchange({
        relinquishedSalePrice: 600_000,
        relinquishedAdjustedBasis: 350_000,
        sellingCostPercent: 5,
        replacementPropertyCost: 620_000,
        bootReceived: 0,
      });
      expect(r.realizedGain).toBeCloseTo(220_000, 0);
      expect(r.recognizedGain).toBe(0);
      expect(r.deferredGain).toBeCloseTo(220_000, 0);
      expect(r.substitutedBasis).toBeCloseTo(400_000, 0);
    });

    it("recognizes gain equal to boot received", () => {
      const r = compute1031Exchange({
        relinquishedSalePrice: 500_000,
        relinquishedAdjustedBasis: 300_000,
        sellingCostPercent: 0,
        replacementPropertyCost: 450_000,
        bootReceived: 50_000,
      });
      expect(r.realizedGain).toBe(200_000);
      expect(r.recognizedGain).toBe(50_000);
      expect(r.deferredGain).toBe(150_000);
    });
  });

  describe("computeSaleTaxSummary", () => {
    it("bundles basis, depreciation, recapture, and capital gain tax", () => {
      const s = computeSaleTaxSummary({
        purchasePrice: 400_000,
        landPercent: 25,
        monthsHeld: 60,
        salePrice: 520_000,
        sellingCostPercent: 6,
        annualNetRentalIncome: 12_000,
        taxableIncomeBeforeQbi: 45_000,
      });

      expect(s.basis.buildingBasis).toBe(300_000);
      expect(s.depreciation.accumulatedDepreciation).toBeGreaterThan(0);
      expect(s.adjustedBasis).toBeLessThan(s.basis.totalBasis);
      expect(s.recapture.totalGain).toBeGreaterThan(0);
      expect(s.qbi?.qbiDeduction).toBeGreaterThan(0);
      expect(s.totalEstimatedTax).toBe(
        s.recapture.estimatedRecaptureTax + s.capitalGainTax.estimatedTax
      );
    });
  });
});
