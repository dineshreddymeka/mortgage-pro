import { describe, expect, it } from "vitest";
import { boundTaxResearchSnapshot } from "../taxResearch/boundSnapshot.js";
import type { ExternalTaxResearchSnapshot } from "../taxResearch/types.js";

describe("boundTaxResearchSnapshot", () => {
  it("strips disallowed reference URLs while keeping titles", () => {
    const raw: ExternalTaxResearchSnapshot = {
      collectionStatus: "partial",
      addressFingerprint: "sha256:94107|123-main-st|place-abc",
      collectedAt: "2026-01-20T18:30:00.000Z",
      normalizedReferences: [
        {
          id: "good",
          topic: "property_tax",
          title: "Official portal",
          url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
        },
        {
          id: "bad",
          topic: "other",
          title: "Random blog",
          url: "https://random.example/taxes",
        },
      ],
      sourceProvenance: {
        provider: "test",
        sources: ["https://www.irs.gov/publications/p530", "https://evil.example/x"],
      },
    };

    const bounded = boundTaxResearchSnapshot(raw);
    expect(bounded.normalizedReferences).toHaveLength(2);
    expect(bounded.normalizedReferences?.[0]?.url).toContain("cdtfa.ca.gov");
    expect(bounded.normalizedReferences?.[1]?.url).toBeUndefined();
    expect(bounded.sourceProvenance?.sources).toEqual(["https://www.irs.gov/publications/p530"]);
  });

  it("caps reference count", () => {
    const refs = Array.from({ length: 60 }, (_, index) => ({
      id: `ref-${index}`,
      topic: "other" as const,
      title: `Title ${index}`,
      url: "https://www.irs.gov/publications/p530",
    }));
    const bounded = boundTaxResearchSnapshot({
      collectionStatus: "complete",
      addressFingerprint: "sha256:test",
      collectedAt: new Date().toISOString(),
      normalizedReferences: refs,
    });
    expect(bounded.normalizedReferences?.length).toBe(50);
  });
});
