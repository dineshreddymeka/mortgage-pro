import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../../config.js";
import { productionTaxResearchCollector } from "./collector.js";
import { resetFetchForTests, setFetchForTests } from "./fetch.js";
import { dedupeReferences } from "./normalize.js";
import { createFixtureFetch } from "./testFixtures.js";

describe("productionTaxResearchCollector", () => {
  beforeEach(() => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    setFetchForTests(createFixtureFetch());
  });

  afterEach(() => {
    resetFetchForTests();
  });

  it("collects federal, state, and county references with provenance", async () => {
    const result = await productionTaxResearchCollector.collect({
      request: {
        propertyDocId: "doc-1",
        propertyAddress: "123 Main St, San Francisco",
        propertyState: "CA",
        propertyPostalCode: "94107",
      },
      addressFingerprint: "sha256:94107|123-main-st",
      requestId: "req-1",
    });

    expect(["complete", "partial"]).toContain(result.collectionStatus);
    expect(result.sourceProvenance?.provider).toBe("official-tax-research-collector");
    expect(result.normalizedReferences?.length).toBeGreaterThan(5);
    expect(result.normalizedReferences?.some((ref) => ref.jurisdiction === "federal")).toBe(true);
    expect(result.normalizedReferences?.some((ref) => ref.jurisdiction === "state")).toBe(true);
    expect(result.normalizedReferences?.some((ref) => ref.jurisdiction === "county")).toBe(true);
    expect(result.sourceProvenance?.sources?.length).toBeGreaterThan(0);
  });

  it("skips county collection when geocoder state mismatches request propertyState", async () => {
    const result = await productionTaxResearchCollector.collect({
      request: {
        propertyDocId: "doc-1",
        propertyAddress: "123 Main St, San Francisco",
        propertyState: "NY",
        propertyPostalCode: "94107",
      },
      addressFingerprint: "sha256:94107|123-main-st",
      requestId: "req-mismatch",
    });

    expect(result.errors?.some((error) => error.code === "geocoder_state_mismatch")).toBe(true);
    expect(result.normalizedReferences?.some((ref) => ref.jurisdiction === "county")).toBe(false);
    expect(result.normalizedReferences?.some((ref) => ref.jurisdiction === "state")).toBe(true);
  });
});

describe("dedupeReferences", () => {
  it("dedupes by normalized URL key", () => {
    const deduped = dedupeReferences([
      {
        id: "a",
        topic: "property_tax",
        title: "One",
        url: "https://www.irs.gov/publications/p530",
        normalizedKey: "irs.gov/publications/p530",
      },
      {
        id: "b",
        topic: "property_tax",
        title: "Duplicate",
        url: "https://www.irs.gov/publications/p530/",
        normalizedKey: "irs.gov/publications/p530",
      },
    ]);
    expect(deduped).toHaveLength(1);
  });
});
