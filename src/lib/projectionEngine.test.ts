import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import { computeMonthlyPayment } from "./mortgageMath";
import { computeRentalAnalysis } from "./rentalMath";
import {
  biweeklyEquivalentExtraPrincipal,
  buildMonthlyProjection,
  netProceedsFromProjection,
  pmiForProjectionMonth,
} from "./projectionEngine";
import { buildAmortizationSchedule } from "./mortgageMath";
import { balanceAfterPaymentMonth } from "./whenToSellMath";

describe("projectionEngine", () => {
  it("month 1 cash flow matches rental baseline when growth/payment plan disabled", () => {
    const state = {
      ...fixtureV2Full,
      growth: undefined,
      paymentPlan: undefined,
      extraPrincipalMonthly: 0,
      sellRentalYieldInclude: undefined,
    };
    const derived = buildMonthlyProjection(state);
    expect(derived.length).toBeGreaterThan(0);
    const m1 = derived[0]!;
    const rental = computeRentalAnalysis(
      state,
      computeMonthlyPayment(
        state.homePrice,
        state.downPayment,
        state.interestRateApr,
        state.termYears,
        state.propertyTaxAnnual,
        state.insuranceAnnual,
        state.hoaMonthly,
        state.pmiMonthly
      )
    );
    expect(m1.cashFlow).toBeCloseTo(rental.cashFlowMonthly, 1);
  });

  it("PMI drops at 78% of original loan balance", () => {
    expect(pmiForProjectionMonth(79_000, 100_000, 200)).toBe(200);
    expect(pmiForProjectionMonth(78_000, 100_000, 200)).toBe(0);
    expect(pmiForProjectionMonth(78_000, 100_000, 0)).toBe(0);
  });

  it("biweekly equivalent adds P&I/12 extra principal per month", () => {
    expect(biweeklyEquivalentExtraPrincipal(1200)).toBeCloseTo(100, 6);
  });

  it("lump sum accelerates paydown in target month", () => {
    const base = buildMonthlyProjection({
      ...fixtureV2Full,
      extraPrincipalMonthly: 0,
      paymentPlan: undefined,
    });
    const withLump = buildMonthlyProjection({
      ...fixtureV2Full,
      extraPrincipalMonthly: 0,
      paymentPlan: { frequency: "monthly", lumpSums: [{ month: 12, amount: 25_000 }] },
    });
    expect(withLump[11]!.loanBalance).toBeLessThan(base[11]!.loanBalance);
    expect(withLump[11]!.extraPrincipal).toBeGreaterThanOrEqual(25_000);
  });

  it("rent growth increases EGI by year 2", () => {
    const flat = buildMonthlyProjection({ ...fixtureV2Full, growth: undefined });
    const growing = buildMonthlyProjection({
      ...fixtureV2Full,
      growth: { rentGrowthPercent: 12, expenseGrowthPercent: 0 },
    });
    expect(growing[12]!.rent).toBeGreaterThan(flat[12]!.rent);
  });

  it("home value at year 5 matches whenToSell futureHomeValue", () => {
    const rows = buildMonthlyProjection(fixtureV2Full);
    const y5 = rows[59]!;
    const expected =
      fixtureV2Full.homePrice *
      (1 + fixtureV2Full.sellAnnualAppreciationPercent / 100) ** 5;
    expect(y5.homeValue).toBeCloseTo(expected, 0);
  });

  it("handles zero/reset scenario without throwing", () => {
    const rows = buildMonthlyProjection(emptyAppState());
    expect(rows).toEqual([]);
  });

  it("net proceeds uses projected balance and value", () => {
    const rows = buildMonthlyProjection(fixtureV2Full);
    const proceeds = netProceedsFromProjection(fixtureV2Full, rows, 60);
    expect(proceeds).toBeGreaterThan(0);
  });

  it("default loan balance track matches standard amortization early months", () => {
    const loan = fixtureV2Full.homePrice - fixtureV2Full.downPayment;
    const sched = buildAmortizationSchedule(loan, fixtureV2Full.interestRateApr, fixtureV2Full.termYears);
    const rows = buildMonthlyProjection({
      ...fixtureV2Full,
      extraPrincipalMonthly: 0,
      paymentPlan: undefined,
      pmiMonthly: 0,
    });
    expect(rows[11]!.loanBalance).toBeCloseTo(balanceAfterPaymentMonth(sched, 12), 0);
  });
});
