import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { buildHouseComparisonRow } from "../lib/houseComparison";
import { bestHouseIdsForMetric, leaderHouseIds, scoreHouseBestCount } from "./compareMetrics";

describe("compareMetrics", () => {
  it("marks every house tied for best on a metric", () => {
    const a = buildHouseComparisonRow("a", 1, {
      ...fixtureV2Full,
      homePrice: 400_000,
      downPayment: 80_000,
    });
    const b = buildHouseComparisonRow("b", 2, {
      ...fixtureV2Full,
      homePrice: 400_000,
      downPayment: 80_000,
    });
    const c = buildHouseComparisonRow("c", 3, {
      ...fixtureV2Full,
      homePrice: 500_000,
      downPayment: 100_000,
    });
    expect(bestHouseIdsForMetric([a, b, c], "homePrice").sort()).toEqual(["a", "b"]);
  });

  it("returns no best when all eligible values match", () => {
    const a = buildHouseComparisonRow("a", 1, fixtureV2Full);
    const b = buildHouseComparisonRow("b", 2, fixtureV2Full);
    expect(bestHouseIdsForMetric([a, b], "homePrice")).toEqual([]);
  });

  it("scores tied bests for both houses and reports tied leaders", () => {
    const bestByMetric = {
      homePrice: ["a", "b"],
      cashFlowMonthly: ["a"],
    };
    const a = buildHouseComparisonRow("a", 1, fixtureV2Full);
    const b = buildHouseComparisonRow("b", 2, fixtureV2Full);
    expect(scoreHouseBestCount(a, bestByMetric)).toBe(2);
    expect(scoreHouseBestCount(b, bestByMetric)).toBe(1);
    expect(leaderHouseIds([a, b], { homePrice: ["a", "b"], cashFlowMonthly: ["a", "b"] })).toEqual([
      "a",
      "b",
    ]);
  });
});
