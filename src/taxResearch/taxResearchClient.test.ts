import { describe, expect, it, vi, afterEach } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import {
  buildCollectHouseTaxResearchRequest,
  collectHouseTaxResearch,
  getTaxResearchApiBaseUrl,
} from "./taxResearchClient";

describe("taxResearchClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers VITE_TAX_RESEARCH_API_BASE_URL over estimate base URL", () => {
    vi.stubEnv("VITE_TAX_RESEARCH_API_BASE_URL", "https://tax.example.com/");
    vi.stubEnv("VITE_ESTIMATE_API_BASE_URL", "https://estimate.example.com");
    expect(getTaxResearchApiBaseUrl()).toBe("https://tax.example.com");
  });

  it("falls back to VITE_ESTIMATE_API_BASE_URL", () => {
    vi.stubEnv("VITE_TAX_RESEARCH_API_BASE_URL", "");
    vi.stubEnv("VITE_ESTIMATE_API_BASE_URL", "https://estimate.example.com/");
    expect(getTaxResearchApiBaseUrl()).toBe("https://estimate.example.com");
  });

  it("buildCollectHouseTaxResearchRequest maps scenario identity and defaults persist true", () => {
    const request = buildCollectHouseTaxResearchRequest(fixtureV2Full, "doc-123", {
      forceRefresh: true,
    });
    expect(request).toMatchObject({
      propertyDocId: "doc-123",
      propertyAddress: fixtureV2Full.propertyAddress,
      propertyPlaceId: fixtureV2Full.propertyPlaceId,
      propertyPostalCode: fixtureV2Full.propertyPostalCode,
      propertyState: fixtureV2Full.propertyState,
      persist: true,
      forceRefresh: true,
    });
  });

  it("throws a clear error when propertyDocId is missing", () => {
    expect(() => buildCollectHouseTaxResearchRequest(fixtureV2Full, "  ")).toThrow(
      /Select a saved house/
    );
  });

  it("validates successful responses via parseExternalTaxResearch", async () => {
    vi.stubEnv("VITE_TAX_RESEARCH_API_BASE_URL", "https://tax.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            persisted: true,
            cacheHit: false,
            accessRole: "owner",
            snapshot: {
              collectionStatus: "complete",
              addressFingerprint: "fp-123",
              collectedAt: "2026-07-23T12:00:00.000Z",
              normalizedReferences: [
                {
                  id: "ref-1",
                  topic: "property_tax",
                  title: "County portal",
                  url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
                  linkStatus: "ok",
                },
              ],
            },
          }),
      }))
    );

    const result = await collectHouseTaxResearch({
      state: fixtureV2Full,
      propertyDocId: "doc-123",
      getToken: async () => "test-token",
    });

    expect(result.snapshot.collectionStatus).toBe("complete");
    expect(result.snapshot.normalizedReferences).toHaveLength(1);
    expect(result.persisted).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://tax.example.com/collectHouseTaxResearch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("maps server errors to TaxResearchClientError", async () => {
    vi.stubEnv("VITE_TAX_RESEARCH_API_BASE_URL", "https://tax.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ ok: false, error: "You do not have access to this house." }),
      }))
    );

    await expect(
      collectHouseTaxResearch({
        state: fixtureV2Full,
        propertyDocId: "doc-123",
        getToken: async () => "test-token",
      })
    ).rejects.toMatchObject({
      code: "server",
      message: "You do not have access to this house.",
    });
  });

  it("rejects invalid snapshots", async () => {
    vi.stubEnv("VITE_TAX_RESEARCH_API_BASE_URL", "https://tax.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            ok: true,
            persisted: true,
            cacheHit: false,
            accessRole: "owner",
            snapshot: { collectionStatus: "complete" },
          }),
      }))
    );

    await expect(
      collectHouseTaxResearch({
        state: fixtureV2Full,
        propertyDocId: "doc-123",
        getToken: async () => "test-token",
      })
    ).rejects.toMatchObject({ code: "invalid-response" });
  });
});
