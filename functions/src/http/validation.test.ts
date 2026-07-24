import { describe, expect, it } from "vitest";
import { TtlCache } from "../cache/ttlCache.js";
import { loadConfig, resetConfigForTests, setConfigForTests } from "../config.js";
import { applyCorsHeaders, resolveCorsOrigin } from "../http/cors.js";
import { RateLimiter } from "../http/rateLimit.js";
import { cacheKeyForBody, validateEstimateRequestBody } from "../http/validate.js";
import { categoryProviders } from "../providers/index.js";

describe("validateEstimateRequestBody", () => {
  it("accepts minimal valid body", () => {
    const result = validateEstimateRequestBody({ homePrice: 500_000 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body.homePrice).toBe(500_000);
  });

  it("rejects missing homePrice", () => {
    const result = validateEstimateRequestBody({});
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range homePrice", () => {
    expect(validateEstimateRequestBody({ homePrice: 0 }).ok).toBe(false);
    expect(validateEstimateRequestBody({ homePrice: 200_000_000 }).ok).toBe(false);
  });
});

describe("cacheKeyForBody", () => {
  it("is stable for same inputs", () => {
    const body = { homePrice: 450_000, zipCode: "94102", termYears: 30, downPaymentPercent: 20 };
    expect(cacheKeyForBody(body, "rate")).toBe(cacheKeyForBody(body, "rate"));
  });
});

describe("TtlCache", () => {
  it("expires entries", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("a", "value", 0);
    expect(cache.get("a", 500)).toBe("value");
    expect(cache.get("a", 2000)).toBeNull();
  });
});

describe("RateLimiter", () => {
  it("blocks after limit", () => {
    const limiter = new RateLimiter(2, 10);
    expect(limiter.check("1.2.3.4", null, 0).allowed).toBe(true);
    expect(limiter.check("1.2.3.4", null, 0).allowed).toBe(true);
    expect(limiter.check("1.2.3.4", null, 0).allowed).toBe(false);
  });
});

describe("CORS", () => {
  it("allows configured origin", () => {
    resetConfigForTests();
    const config = loadConfig({ ALLOWED_ORIGINS: "https://example.com" });
    setConfigForTests(config);
    expect(resolveCorsOrigin("https://example.com", config)).toBe("https://example.com");
    expect(resolveCorsOrigin("https://evil.test", config)).toBeNull();
  });

  it("sets allow headers", () => {
    const headers: Record<string, string> = {};
    applyCorsHeaders(headers, "https://example.com", loadConfig({ ALLOWED_ORIGINS: "https://example.com" }));
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://example.com");
  });
});

describe("category providers", () => {
  it("return mapped scenario fields", async () => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    const body = { homePrice: 600_000, zipCode: "78701", termYears: 30, downPaymentPercent: 20 };
    const all = await Promise.all(categoryProviders.map((p) => p.fetch(body)));
    const fields = new Set(all.flat().map((s) => s.targetField));
    expect(fields.has("interestRateApr")).toBe(true);
    expect(fields.has("propertyTaxAnnual")).toBe(true);
    expect(fields.has("insuranceAnnual")).toBe(true);
    expect(fields.has("monthlyRent")).toBe(true);
    expect(fields.has("currentHomeValue")).toBe(true);
  });
});
