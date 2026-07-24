import { describe, expect, it } from "vitest";
import {
  aggregateMultifamilyIncome,
  computeBrrrrCashLeft,
  computeFlipProceeds,
  computeStrIncome,
  strIncomeFromMonthlyRent,
} from "./dealStrategies";

describe("dealStrategies", () => {
  describe("computeStrIncome", () => {
    it("computes STR gross, fees, and EGI", () => {
      const r = computeStrIncome({
        nightlyRate: 200,
        nightsBookedPerMonth: 18,
        cleaningFeePerStay: 120,
        staysPerMonth: 6,
        platformFeePercent: 3,
        otherMonthlyIncome: 100,
        vacancyRatePercent: 5,
      });
      expect(r.grossBookingIncome).toBe(3_600);
      expect(r.cleaningIncome).toBe(720);
      expect(r.grossScheduledIncomeMonthly).toBe(4_420);
      expect(r.platformFees).toBeCloseTo(132.6, 1);
      expect(r.effectiveGrossIncomeMonthly).toBeGreaterThan(0);
      expect(r.effectiveGrossIncomeMonthly).toBeLessThan(r.grossScheduledIncomeMonthly);
    });

    it("returns zero EGI for empty bookings", () => {
      const r = computeStrIncome({
        nightlyRate: 0,
        nightsBookedPerMonth: 0,
        cleaningFeePerStay: 0,
        staysPerMonth: 0,
      });
      expect(r.effectiveGrossIncomeMonthly).toBe(0);
    });
  });

  describe("aggregateMultifamilyIncome", () => {
    it("sums units and applies per-unit vacancy", () => {
      const r = aggregateMultifamilyIncome({
        units: [
          { monthlyRent: 1200, vacancyRatePercent: 5 },
          { monthlyRent: 1400, otherMonthlyIncome: 50, vacancyRatePercent: 8 },
          { monthlyRent: 1100 },
        ],
        defaultVacancyRatePercent: 6,
      });
      expect(r.unitCount).toBe(3);
      expect(r.grossScheduledIncomeMonthly).toBe(3_750);
      expect(r.vacancyLossMonthly).toBeCloseTo(60 + 116 + 66, 0);
      expect(r.averageRentPerUnit).toBeCloseTo(1_250, 0);
    });

    it("handles empty portfolio", () => {
      const r = aggregateMultifamilyIncome({ units: [] });
      expect(r.unitCount).toBe(0);
      expect(r.effectiveGrossIncomeMonthly).toBe(0);
    });
  });

  describe("computeBrrrrCashLeft", () => {
    it("computes cash left after refi cash-out", () => {
      const r = computeBrrrrCashLeft({
        purchasePrice: 180_000,
        rehabCost: 45_000,
        buyClosingCosts: 6_000,
        holdingCostsDuringRehab: 4_000,
        downPayment: 36_000,
        initialLoanAmount: 144_000,
        arv: 280_000,
        refiLtvPercent: 75,
        refiClosingCosts: 5_500,
      });
      expect(r.totalCashInvested).toBe(91_000);
      expect(r.refiLoanAmount).toBe(210_000);
      expect(r.cashOutAtRefi).toBe(60_500);
      expect(r.cashLeftInDeal).toBe(30_500);
      expect(r.infiniteReturn).toBe(false);
    });

    it("flags infinite return when cash out covers all invested cash", () => {
      const r = computeBrrrrCashLeft({
        purchasePrice: 100_000,
        rehabCost: 20_000,
        buyClosingCosts: 3_000,
        holdingCostsDuringRehab: 2_000,
        downPayment: 25_000,
        initialLoanAmount: 75_000,
        arv: 200_000,
        refiLtvPercent: 80,
        refiClosingCosts: 4_000,
      });
      expect(r.cashOutAtRefi).toBeGreaterThanOrEqual(r.totalCashInvested);
      expect(r.infiniteReturn).toBe(true);
      expect(r.cashLeftInDeal).toBe(0);
    });
  });

  describe("computeFlipProceeds", () => {
    it("computes profit and ROI for an all-cash flip", () => {
      const r = computeFlipProceeds({
        purchasePrice: 250_000,
        rehabCost: 35_000,
        buyClosingCosts: 8_000,
        holdingCosts: 6_000,
        salePrice: 360_000,
        sellingCostPercent: 6,
      });
      expect(r.totalProjectCost).toBe(299_000);
      expect(r.netSaleProceeds).toBeCloseTo(338_400, 0);
      expect(r.netProfit).toBeCloseTo(39_400, 0);
      expect(r.roiPercent).toBeGreaterThan(0);
    });

    it("subtracts loan payoff from sale proceeds", () => {
      const r = computeFlipProceeds({
        purchasePrice: 200_000,
        rehabCost: 30_000,
        buyClosingCosts: 5_000,
        holdingCosts: 4_000,
        financingCosts: 3_000,
        salePrice: 310_000,
        sellingCostPercent: 5,
        loanPayoffAtSale: 180_000,
      });
      expect(r.netSaleProceeds).toBeCloseTo(114_500, 0);
      expect(r.netProfit).toBeLessThan(0);
    });
  });

  describe("strIncomeFromMonthlyRent", () => {
    it("derives nightly rate from target monthly rent", () => {
      const r = strIncomeFromMonthlyRent(3_000, { nightsBookedPerMonth: 25 });
      expect(r.grossBookingIncome).toBeCloseTo(3_000, 0);
    });
  });
});
