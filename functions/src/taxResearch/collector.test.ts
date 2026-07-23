import { describe, expect, it } from "vitest";
import { getTaxResearchCollector, resetTaxResearchCollectorForTests } from "../taxResearch/collector.js";

describe("stubTaxResearchCollector", () => {
  it("returns a pending snapshot without external references", async () => {
    resetTaxResearchCollectorForTests();
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
