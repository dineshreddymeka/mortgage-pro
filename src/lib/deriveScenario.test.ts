import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import { deriveScenario } from "./deriveScenario";
import { buildFullScenarioExport } from "./scenarioExport";

describe("deriveScenario", () => {
  it("derives payment, rental, schedules, and exit outputs from one scenario", () => {
    const d = deriveScenario(fixtureV2Full);
    expect(d.loanAmount).toBe(fixtureV2Full.homePrice - fixtureV2Full.downPayment);
    expect(d.monthlyPayment.total).toBeGreaterThan(0);
    expect(d.rental.cashFlowMonthly).toBeDefined();
    expect(d.rental.dscr).not.toBeNull();
    expect(d.rental.grossRentMultiplier).not.toBeNull();
    expect(d.rental.onePercentRuleRatio).not.toBeNull();
    expect(d.amortization.length).toBe(fixtureV2Full.termYears * 12);
    expect(d.amortizationWithExtraPrincipal).not.toBeNull();
    expect(d.sellRows).toHaveLength(30);
    expect(d.realWealthSnapshots.length).toBeGreaterThan(0);
    expect(d.maxOffer.fromDti28Pct).toBeGreaterThan(0);
  });

  it("handles zero/reset scenario without Infinity derived metrics", () => {
    const d = deriveScenario(emptyAppState());
    expect(d.rental.dscr).toBeNull();
    expect(d.rental.grossRentMultiplier).toBeNull();
    expect(d.rental.onePercentRuleRatio).toBeNull();
    expect(d.maxOffer.fromDti28Pct).toBe(0);
  });

  it("powers scenarioExport calculated block consistently", () => {
    const exported = buildFullScenarioExport(fixtureV2Full);
    const d = deriveScenario(fixtureV2Full);
    expect(exported.calculated.mortgage.monthlyPaymentForScenarioTerm.total).toBe(
      d.monthlyPayment.total
    );
    expect(exported.calculated.rental.rentalProformaWithMortgageTerm.cashFlowMonthly).toBe(
      d.rental.cashFlowMonthly
    );
    expect(exported.calculated.rental.dscr).toBe(d.rental.dscr);
    expect(exported.calculated.maxOffer.fromDti28Pct).toBe(d.maxOffer.fromDti28Pct);
  });
});
