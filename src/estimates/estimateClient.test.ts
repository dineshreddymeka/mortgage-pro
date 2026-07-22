import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import { applyExternalEstimates } from "./applyExternalEstimate";
import { fetchExternalEstimates, flattenEstimateSuggestions } from "./estimateClient";

describe("external estimates", () => {
  it("fetchExternalEstimates returns offline suggestions without mutating scenario", async () => {
    const before = structuredClone(fixtureV2Full);
    const bundles = await fetchExternalEstimates(fixtureV2Full, { preferOfflineOnly: true, bypassCache: true });
    expect(bundles[0]?.offline).toBe(true);
    expect(fixtureV2Full).toEqual(before);
  });

  it("applyExternalEstimates only changes scenario when explicitly selected", () => {
    const suggestions = flattenEstimateSuggestions([
      {
        providerId: "offline-stub",
        fetchedAt: new Date().toISOString(),
        offline: true,
        suggestions: [
          { id: "rate-interestRateApr", category: "rate", targetField: "interestRateApr", label: "Rate", value: 5.5, unit: "% APR", source: "test", fetchedAt: new Date().toISOString(), confidence: "low" },
          { id: "rent-monthlyRent", category: "rent", targetField: "monthlyRent", label: "Rent", value: 2800, unit: "USD / month", source: "test", fetchedAt: new Date().toISOString(), confidence: "low" },
        ],
      },
    ]);
    expect(applyExternalEstimates(emptyAppState(), suggestions, []).applied).toHaveLength(0);
    const applied = applyExternalEstimates(emptyAppState(), suggestions, ["rate-interestRateApr"]);
    expect(applied.nextState.interestRateApr).toBe(5.5);
    expect(applied.nextState.monthlyRent).toBe(0);
  });
});
