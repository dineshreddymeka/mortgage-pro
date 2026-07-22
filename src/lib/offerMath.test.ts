import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import type { AppPersisted } from "../storage/mortgageState";
import { emptyAppState } from "../storage/mortgageState";
import { computeMonthlyPayment } from "./mortgageMath";
import {
  computeMaxOfferOutputs,
  maxHomePriceForTargetCashFlow,
  maxHomePriceForTargetCashOnCash,
  maxHomePriceForTargetDscr,
  maxHomePriceForTargetPayment,
  readOfferTargets,
  housingBudgetBaseParams,
} from "./offerMath";
import {
  computeDscr,
  computeGrossRentMultiplier,
  computeOnePercentRuleRatio,
  computeRentalAnalysis,
} from "./rentalMath";

describe("offerMath", () => {
  it("readOfferTargets reads optional persisted targets", () => {
    expect(readOfferTargets(fixtureV2Full)).toBeNull();
    const withTarget = {
      ...fixtureV2Full,
      offerTargets: {
        targetDscr: 1.25,
        targetCashFlowMonthly: 400,
        targetCashOnCashPercent: 8,
        targetPaymentMonthly: 2800,
      },
    } as AppPersisted;
    expect(readOfferTargets(withTarget)).toEqual({
      targetDscr: 1.25,
      targetCashFlowMonthly: 400,
      targetCashOnCashPercent: 8,
      targetPaymentMonthly: 2800,
    });
  });

  it("computeMaxOfferOutputs derives DTI and budget caps without persisting", () => {
    const out = computeMaxOfferOutputs(fixtureV2Full);
    expect(out.fromDti28Pct).toBeGreaterThan(0);
    expect(out.fromCustomHousingBudget).toBeGreaterThan(0);
    expect(out.targets).toBeNull();
    expect(out.fromTargetDscr).toBe(0);
    expect(out.fromTargetCashFlow).toBe(0);
    expect(out.bindingCap).toBeGreaterThan(0);
  });

  it("computeMaxOfferOutputs uses all offerTargets when set", () => {
    const withTarget = {
      ...fixtureV2Full,
      offerTargets: {
        targetDscr: 1.25,
        targetCashFlowMonthly: 200,
        targetCashOnCashPercent: 5,
        targetPaymentMonthly: 3500,
      },
    } as AppPersisted;
    const out = computeMaxOfferOutputs(withTarget);
    expect(out.targets?.targetDscr).toBe(1.25);
    expect(out.fromTargetDscr).toBeGreaterThan(0);
    expect(out.fromTargetCashFlow).toBeGreaterThan(0);
    expect(out.fromTargetCashOnCash).toBeGreaterThan(0);
    expect(out.fromTargetPayment).toBeGreaterThan(0);
    expect(out.bindingCap).toBeGreaterThan(0);
    expect(out.bindingCap).toBeLessThanOrEqual(out.fromDti28Pct);
  });

  it("maxHomePriceForTargetDscr returns 0 when target cannot be met", () => {
    const base = housingBudgetBaseParams(emptyAppState());
    expect(maxHomePriceForTargetDscr(99, emptyAppState(), base)).toBe(0);
  });

  it("target search helpers return 0 for empty scenario", () => {
    const base = housingBudgetBaseParams(emptyAppState());
    expect(maxHomePriceForTargetCashFlow(100, emptyAppState(), base)).toBe(0);
    expect(maxHomePriceForTargetCashOnCash(10, emptyAppState(), base)).toBe(0);
    expect(maxHomePriceForTargetPayment(2000, emptyAppState(), base)).toBe(0);
  });
});

describe("rental derived metrics", () => {
  const mortgage = computeMonthlyPayment(
    fixtureV2Full.homePrice,
    fixtureV2Full.downPayment,
    fixtureV2Full.interestRateApr,
    fixtureV2Full.termYears,
    fixtureV2Full.propertyTaxAnnual,
    fixtureV2Full.insuranceAnnual,
    fixtureV2Full.hoaMonthly,
    fixtureV2Full.pmiMonthly
  );

  it("computeRentalAnalysis includes DSCR, GRM, and 1% rule", () => {
    const r = computeRentalAnalysis(fixtureV2Full, mortgage);
    expect(r.dscr).not.toBeNull();
    expect(r.dscr!).toBeGreaterThan(0);
    expect(r.grossRentMultiplier).not.toBeNull();
    expect(r.onePercentRuleRatio).not.toBeNull();
    expect(r.onePercentRuleRatio!).toBeCloseTo(fixtureV2Full.monthlyRent / fixtureV2Full.homePrice, 6);
  });

  it("DSCR is null for all-cash (no debt service)", () => {
    const allCash = { ...fixtureV2Full, downPayment: fixtureV2Full.homePrice };
    const m = computeMonthlyPayment(
      allCash.homePrice,
      allCash.downPayment,
      allCash.interestRateApr,
      allCash.termYears,
      allCash.propertyTaxAnnual,
      allCash.insuranceAnnual,
      allCash.hoaMonthly,
      allCash.pmiMonthly
    );
    const r = computeRentalAnalysis(allCash, m);
    expect(r.dscr).toBeNull();
    expect(computeDscr(r.noiAnnual, m.principalAndInterest, m.pmi)).toBeNull();
  });

  it("GRM and 1% rule are null for zero rent or zero price", () => {
    expect(computeGrossRentMultiplier(500_000, 0)).toBeNull();
    expect(computeGrossRentMultiplier(0, 2500)).toBeNull();
    expect(computeOnePercentRuleRatio(500_000, 0)).toBeNull();
    expect(computeOnePercentRuleRatio(0, 2500)).toBeNull();
  });

  it("metrics never return Infinity for edge inputs", () => {
    const empty = emptyAppState();
    const m = computeMonthlyPayment(0, 0, 0, 30, 0, 0, 0, 0);
    const r = computeRentalAnalysis(empty, m);
    expect(r.dscr).toBeNull();
    expect(r.grossRentMultiplier).toBeNull();
    expect(r.onePercentRuleRatio).toBeNull();
  });
});
