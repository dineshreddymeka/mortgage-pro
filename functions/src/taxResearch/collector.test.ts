import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../config.js";
import { resetFetchForTests, setFetchForTests } from "../providers/taxResearch/fetch.js";
import { createFixtureFetch } from "../providers/taxResearch/testFixtures.js";
import {
  getTaxResearchCollector,
  resetTaxResearchCollectorForTests,
  setTaxResearchCollectorForTests,
  stubTaxResearchCollector,
} from "../taxResearch/collector.js";

describe("stubTaxResearchCollector", () => {
  it("returns a pending snapshot without external references", async () => {
    setTaxResearchCollectorForTests(stubTaxResearchCollector);
    const collector = getTaxResearchCollector();
    const result = await collector.collect({
      request: {
        propertyDocId: "doc-1",
        propertyAddress: "123 Main St",
        propertyPostalCode: "94107",
      },
      addressFingerprint: "sha256:94107|123-main-st",
      requestId: "req-1",
    });

    expect(result.collectionStatus).toBe("pending");
    expect(result.addressFingerprint).toBe("sha256:94107|123-main-st");
    expect(result.normalizedReferences).toEqual([]);
    expect(result.errors?.[0]?.code).toBe("collector_not_implemented");
    expect(result.sourceProvenance?.provider).toBe("stub-tax-collector");
  });
});

describe("production tax research collector wiring", () => {
  beforeEach(() => {
    resetTaxResearchCollectorForTests();
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    setFetchForTests(createFixtureFetch());
  });

  afterEach(() => {
    resetFetchForTests();
    resetTaxResearchCollectorForTests();
  });

  it("uses the production collector by default with mocked upstream fetch", async () => {
    const collector = getTaxResearchCollector();
    expect(collector.id).toBe("official-tax-research-collector");

    const result = await collector.collect({
      request: {
        propertyDocId: "doc-1",
        propertyAddress: "123 Main St, San Francisco",
        propertyState: "CA",
        propertyPostalCode: "94107",
      },
      addressFingerprint: "sha256:94107|123-main-st",
      requestId: "req-2",
    });

    expect(result.collectionStatus).not.toBe("pending");
    expect(result.normalizedReferences?.length).toBeGreaterThan(0);
  });
});
