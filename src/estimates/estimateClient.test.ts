import { describe, expect, it, vi, afterEach } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import { applyExternalEstimates } from "./applyExternalEstimate";
import { fetchExternalEstimates, flattenEstimateSuggestions, resetEstimateClientCacheForTests } from "./estimateClient";
import { EstimateCache } from "./estimateCache";

describe("external estimates", () => {
  afterEach(() => {
    resetEstimateClientCacheForTests();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fetchExternalEstimates returns offline suggestions without mutating scenario", async () => {
    vi.stubEnv("VITE_ESTIMATE_API_BASE_URL", "");
    const before = structuredClone(fixtureV2Full);
    const bundles = await fetchExternalEstimates(fixtureV2Full, { preferOfflineOnly: true, bypassCache: true });
    expect(bundles[0]?.offline).toBe(true);
    expect(fixtureV2Full).toEqual(before);
  });

  it("falls back to offline stub when proxy fails", async () => {
    vi.stubEnv("VITE_ESTIMATE_API_BASE_URL", "https://proxy.example.com");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502, text: async () => "bad gateway" })));
    const bundles = await fetchExternalEstimates(fixtureV2Full, { bypassCache: true });
    expect(bundles.some((b) => b.providerId === "offline-stub")).toBe(true);
  });

  it("uses proxy bundle when configured and successful", async () => {
    vi.stubEnv("VITE_ESTIMATE_API_BASE_URL", "https://proxy.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          providerId: "server-proxy",
          fetchedAt: new Date().toISOString(),
          offline: false,
          suggestions: [
            {
              id: "rate-interestRateApr",
              category: "rate",
              targetField: "interestRateApr",
              label: "Proxy rate",
              value: 5.875,
              unit: "% APR",
              source: "upstream-mortgage-rates",
              fetchedAt: new Date().toISOString(),
              confidence: "medium",
            },
          ],
        }),
      }))
    );
    const bundles = await fetchExternalEstimates(fixtureV2Full, { bypassCache: true });
    expect(bundles[0]?.providerId).toBe("server-proxy");
    expect(bundles[0]?.offline).toBe(false);
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

  it("client cache stores provider bundles", () => {
    const cache = new EstimateCache(60_000, false);
    const bundle = { providerId: "offline-stub", fetchedAt: new Date().toISOString(), offline: true, suggestions: [] };
    cache.set("offline-stub", "500:94102", bundle, 0);
    expect(cache.get("offline-stub", "500:94102", 30_000)?.providerId).toBe("offline-stub");
  });
});
