import { describe, expect, it } from "vitest";
import { EstimateCache, contextCacheKey } from "./estimateCache";

describe("EstimateCache", () => {
  it("stores and retrieves bundles until TTL expires", () => {
    const cache = new EstimateCache(60_000, false);
    const key = contextCacheKey({ homePrice: 500_000, zipCode: "94107" });
    const bundle = { providerId: "offline-stub", fetchedAt: new Date().toISOString(), offline: true, suggestions: [] };
    cache.set("offline-stub", key, bundle, 1_000);
    expect(cache.get("offline-stub", key, 1_000)?.providerId).toBe("offline-stub");
    expect(cache.get("offline-stub", key, 100_000)).toBeNull();
  });
});
