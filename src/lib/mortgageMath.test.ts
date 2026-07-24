import { describe, expect, it } from "vitest";
import {
  buildAmortizationSchedule,
  computeMonthlyPayment,
  dtiRatios,
  impliedAnnualAppreciationPercent,
  monthlyPiPayment,
  refiBreakevenMonthsFromSavings,
  scheduleTotals,
} from "./mortgageMath";

describe("mortgageMath", () => {
  it("computeMonthlyPayment matches standard 30-year amortization", () => {
    const b = computeMonthlyPayment(300_000, 60_000, 6, 30, 3600, 1200, 0, 0);
    expect(b.loanAmount).toBe(240_000);
    expect(b.principalAndInterest).toBeCloseTo(1438.92, 1);
    expect(b.total).toBeCloseTo(b.principalAndInterest + 300 + 100, 1);
  });

  it("monthlyPiPayment at zero rate divides evenly", () => {
    expect(monthlyPiPayment(120_000, 0, 120)).toBeCloseTo(1000, 5);
  });

  it("buildAmortizationSchedule pays off the loan", () => {
    const rows = buildAmortizationSchedule(100_000, 5, 30);
    expect(rows.length).toBe(360);
    expect(rows[rows.length - 1]?.balance).toBeCloseTo(0, 0);
    const totals = scheduleTotals(rows);
    expect(totals.totalPrincipal).toBeCloseTo(100_000, 0);
  });

  it("impliedAnnualAppreciationPercent compounds purchase to present value", () => {
    const pct = impliedAnnualAppreciationPercent(100_000, 110_000, 2);
    expect(pct).toBeCloseTo(4.88, 1);
  });

  it("dtiRatios returns null front/back when income is zero", () => {
    const d = dtiRatios(0, 2000, 500);
    expect(d.frontEndPct).toBeNull();
    expect(d.backEndPct).toBeNull();
  });

  it("refiBreakevenMonthsFromSavings is null without positive savings", () => {
    expect(refiBreakevenMonthsFromSavings(3000, 1800, 1900)).toBeNull();
    expect(refiBreakevenMonthsFromSavings(3000, 2000, 1800)).toBeCloseTo(15, 5);
  });
});
