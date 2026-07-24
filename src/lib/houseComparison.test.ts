import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import {
  bestHouseIdForMetric,
  buildHouseComparisonRow,
  isBetterMetric,
} from "./houseComparison";

describe("houseComparison", () => {
  it("buildHouseComparisonRow includes rental investor metrics", () => {
    const row = buildHouseComparisonRow("a", 1, fixtureV2Full);
    expect(row.dscr).not.toBeNull();
    expect(row.grossRentMultiplier).not.toBeNull();
    expect(row.onePercentRuleRatio).not.toBeNull();
  });

  it("includes after-tax metrics when tax modeling enabled", () => {
    const row = buildHouseComparisonRow("a", 1, {
      ...fixtureV2Full,
      tax: { enabled: true, marginalIncomeTaxRatePercent: 24 },
    });
    expect(row.afterTaxCashFlowAnnual).not.toBeNull();
    expect(row.afterTaxRealWealthYear5).not.toBeNull();
  });

  it("empty scenario yields null investor metrics without NaN", () => {
    const row = buildHouseComparisonRow("z", 1, emptyAppState());
    expect(row.dscr).toBeNull();
    expect(row.grossRentMultiplier).toBeNull();
    expect(row.onePercentRuleRatio).toBeNull();
    expect(row.afterTaxCashFlowAnnual).toBeNull();
    expect(row.afterTaxRealWealthYear5).toBeNull();
  });

  it("isBetterMetric treats GRM as lower-is-better and DSCR as higher-is-better", () => {
    expect(isBetterMetric("grossRentMultiplier", 8, 10)).toBe(true);
    expect(isBetterMetric("dscr", 1.4, 1.2)).toBe(true);
    expect(isBetterMetric("onePercentRuleRatio", 0.009, 0.011)).toBe(false);
  });

  it("bestHouseIdForMetric skips rows with null values", () => {
    const a = buildHouseComparisonRow("a", 1, fixtureV2Full);
    const cheaper = buildHouseComparisonRow("b", 2, { ...fixtureV2Full, homePrice: 380_000, downPayment: 76_000 });
    expect(bestHouseIdForMetric([a, cheaper], "dscr")).toBeTruthy();
    const empty = buildHouseComparisonRow("z", 3, emptyAppState());
    expect(bestHouseIdForMetric([empty, empty], "dscr")).toBeNull();
  });
});
