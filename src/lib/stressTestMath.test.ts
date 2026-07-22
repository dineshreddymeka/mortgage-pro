import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import {
  applyStressDeltas,
  computeStressTestComparison,
  readStressTestDeltas,
} from "./stressTestMath";

describe("stressTestMath", () => {
  it("readStressTestDeltas reads persisted deltas only", () => {
    expect(readStressTestDeltas(fixtureV2Full)).toBeNull();
    const withDeltas = {
      ...fixtureV2Full,
      stressTestDeltas: { rateDeltaPct: 1, rentDeltaPct: -10 },
    };
    expect(readStressTestDeltas(withDeltas)).toEqual({ rateDeltaPct: 1, rentDeltaPct: -10 });
  });

  it("applyStressDeltas clones scenario without mutating input", () => {
    const deltas = { rateDeltaPct: 1, rentDeltaPct: -10 };
    const stressed = applyStressDeltas(fixtureV2Full, deltas);
    expect(stressed.interestRateApr).toBe(fixtureV2Full.interestRateApr + 1);
    expect(stressed.monthlyRent).toBeLessThan(fixtureV2Full.monthlyRent);
    expect(fixtureV2Full.interestRateApr).toBe(6.25);
  });

  it("computeStressTestComparison uses deriveScenario on copies", () => {
    const comparison = computeStressTestComparison(fixtureV2Full, { rateDeltaPct: 2 });
    expect(comparison.baseline.paymentMonthly).toBeGreaterThan(0);
    expect(comparison.stressed.paymentMonthly).toBeGreaterThan(comparison.baseline.paymentMonthly);
    expect(comparison.stressed.cashFlowMonthly).toBeLessThan(comparison.baseline.cashFlowMonthly);
  });

  it("baseline equals stressed when no deltas", () => {
    const comparison = computeStressTestComparison(fixtureV2Full, {});
    expect(comparison.stressed.paymentMonthly).toBe(comparison.baseline.paymentMonthly);
    expect(comparison.stressed.cashFlowMonthly).toBe(comparison.baseline.cashFlowMonthly);
  });
});
