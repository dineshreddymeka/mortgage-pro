import { describe, expect, it } from "vitest";
import {
  carryingCommonSummaryItems,
  financingCommonSummaryItems,
  upfrontCommonSummaryItems,
} from "./commonInputsSummary";

describe("commonInputsSummary", () => {
  it("builds financing loan + carrying items with optional PMI and extra principal", () => {
    const items = financingCommonSummaryItems({
      homePrice: 400_000,
      downPayment: 80_000,
      downPaymentPercent: 20,
      interestRateApr: 6.5,
      termYears: 30,
      propertyTaxAnnual: 4800,
      insuranceAnnual: 1200,
      hoaMonthly: 50,
      pmiMonthly: 0,
      extraPrincipalMonthly: 200,
    });

    expect(items.map((i) => i.label)).toEqual([
      "Price",
      "Down",
      "Rate · term",
      "Tax / mo",
      "Ins / mo",
      "HOA / mo",
      "Carrying / mo",
      "Extra principal",
    ]);
    expect(items.find((i) => i.label === "Price")?.value).toContain("400");
    expect(items.find((i) => i.label === "Down")?.value).toContain("20.0%");
    expect(items.find((i) => i.label === "Rate · term")?.value).toBe("6.5% · 30y");
    expect(items.find((i) => i.label === "Tax / mo")?.value).toContain("400");
    expect(items.find((i) => i.label === "Carrying / mo")?.emphasize).toBe(true);
    expect(items.find((i) => i.label === "Extra principal")?.value).toContain("200");
  });

  it("includes PMI when down payment is under 20%", () => {
    const items = financingCommonSummaryItems({
      homePrice: 400_000,
      downPayment: 40_000,
      downPaymentPercent: 10,
      interestRateApr: 6,
      termYears: 30,
      propertyTaxAnnual: 0,
      insuranceAnnual: 0,
      hoaMonthly: 0,
      pmiMonthly: 120,
      extraPrincipalMonthly: 0,
    });
    expect(items.some((i) => i.label === "PMI / mo")).toBe(true);
    expect(items.find((i) => i.label === "PMI / mo")?.value).toContain("120");
  });

  it("builds upfront cash-in summary items", () => {
    const items = upfrontCommonSummaryItems({
      homePrice: 350_000,
      downPayment: 70_000,
      closingCosts: 8_000,
      miscInitialCash: 2_000,
    });
    expect(items.map((i) => i.label)).toEqual(["Price", "Down", "Closing", "Misc", "Cash in"]);
    expect(items.find((i) => i.label === "Cash in")?.emphasize).toBe(true);
    expect(items.find((i) => i.label === "Cash in")?.value).toContain("80");
  });

  it("builds carrying tax/ins/HOA items for rental OpEx", () => {
    const items = carryingCommonSummaryItems({
      propertyTaxAnnual: 5_000,
      propertyTaxPercent: 1.25,
      insuranceAnnual: 1_500,
      hoaMonthly: 75,
    });
    expect(items.map((i) => i.label)).toEqual(["Tax / yr", "Ins / yr", "HOA / mo"]);
    expect(items[0]?.value).toContain("1.25%");
  });
});
