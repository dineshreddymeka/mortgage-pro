import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { computeMonthlyPayment } from "./mortgageMath";
import {
  cashFlowAnnualFromYieldToggles,
  cashFlowMonthlyFromYieldToggles,
  computeRentalAnalysis,
  cumulativeCashFlowThroughExitMonths,
  RENTAL_YIELD_PI_ID,
} from "./rentalMath";

describe("rentalMath", () => {
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

  it("computeRentalAnalysis derives NOI and cash-on-cash from scenario inputs", () => {
    const r = computeRentalAnalysis(fixtureV2Full, mortgage);
    expect(r.grossScheduledIncomeMonthly).toBe(
      fixtureV2Full.monthlyRent + fixtureV2Full.otherMonthlyIncome
    );
    expect(r.initialCashInvested).toBe(
      fixtureV2Full.downPayment + fixtureV2Full.closingCosts + fixtureV2Full.miscInitialCash
    );
    expect(r.cashFlowMonthly).toBeCloseTo(r.noiMonthly - r.principalAndInterestMonthly - r.pmiMonthly, 5);
  });

  it("yield toggles can exclude P&I from gain cash flow", () => {
    const r = computeRentalAnalysis(fixtureV2Full, mortgage);
    const withPi = cashFlowMonthlyFromYieldToggles(r, {}, true);
    const withoutPi = cashFlowMonthlyFromYieldToggles(r, { [RENTAL_YIELD_PI_ID]: false }, true);
    expect(withoutPi).toBeGreaterThan(withPi);
    expect(cashFlowAnnualFromYieldToggles(r, { [RENTAL_YIELD_PI_ID]: false })).toBeCloseTo(
      withoutPi * 12,
      5
    );
  });

  it("cumulativeCashFlowThroughExitMonths uses EGI-only months after loan payoff", () => {
    const r = computeRentalAnalysis(fixtureV2Full, mortgage);
    const monthDuringLoan = cashFlowMonthlyFromYieldToggles(r, {}, true);
    const monthAfterPayoff = r.effectiveGrossIncomeMonthly;
    expect(monthAfterPayoff).toBeGreaterThan(monthDuringLoan);
    const atPayoff = cumulativeCashFlowThroughExitMonths(r, {}, 15, 15 * 12);
    const oneMonthLater = cumulativeCashFlowThroughExitMonths(r, {}, 15, 15 * 12 + 1);
    expect(oneMonthLater - atPayoff).toBeCloseTo(monthAfterPayoff, 5);
  });
});
