import { describe, expect, it } from "vitest";
import { estimateLocationCosts, normalizeStateCode } from "./locationCostEstimator";

describe("locationCostEstimator", () => {
  it("normalizes state", () => expect(normalizeStateCode(" tx ")).toBe("TX"));
  it("state hints", () => expect(estimateLocationCosts("TX").suggestedPropertyTaxPercent).toBeGreaterThan(1.5));
});
