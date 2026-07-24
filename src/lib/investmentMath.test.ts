import { describe, expect, it } from "vitest";
import {
  annualizedIrrFromMonthly,
  buildInvestmentCashFlows,
  computeInvestmentMetrics,
  equityMultipleFromFlows,
  irrMonthlyPercent,
} from "./investmentMath";

describe("investmentMath", () => {
  it("computes equity multiple from flows and proceeds", () => {
    const mult = equityMultipleFromFlows(100_000, [500, 500, 500], 120_000);
    expect(mult).toBeCloseTo(1.215, 3);
  });

  it("returns null equity multiple when no cash invested", () => {
    expect(equityMultipleFromFlows(0, [100], 50_000)).toBeNull();
  });

  it("finds IRR for a simple profitable hold", () => {
    const flows = buildInvestmentCashFlows(100_000, [800, 800, 800, 800], 110_000);
    const monthly = irrMonthlyPercent(flows);
    expect(monthly).not.toBeNull();
    const annual = annualizedIrrFromMonthly(monthly);
    expect(annual).not.toBeNull();
    expect(annual!).toBeGreaterThan(0);
  });

  it("returns null IRR when all later flows are zero", () => {
    expect(irrMonthlyPercent([-100_000, 0, 0, 0])).toBeNull();
  });

  it("returns null metrics when initial investment is zero", () => {
    const m = computeInvestmentMetrics(0, [1000], 50_000);
    expect(m.irrAnnualPercent).toBeNull();
    expect(m.equityMultiple).toBeNull();
  });

  it("computeInvestmentMetrics bundles IRR and multiple", () => {
    const m = computeInvestmentMetrics(50_000, Array(12).fill(400), 60_000);
    expect(m.equityMultiple).not.toBeNull();
    expect(m.equityMultiple!).toBeGreaterThan(1);
  });
});
