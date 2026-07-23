import { describe, expect, it } from "vitest";
import { mergeResearchSnapshot } from "../taxResearch/persist.js";
import type { ExternalTaxResearchSnapshot } from "../taxResearch/types.js";

describe("mergeResearchSnapshot", () => {
  it("preserves manual taxIssues and other research fields", () => {
    const scenario = {
      propertyAddress: "123 Main St",
      monthlyRent: 2500,
      research: {
        notes: "Keep these notes",
        taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
        links: [{ id: "link-1", title: "County map", url: "https://example.gov/map" }],
      },
    };

    const snapshot: ExternalTaxResearchSnapshot = {
      collectionStatus: "complete",
      addressFingerprint: "sha256:94107|123-main-st",
      collectedAt: "2026-07-23T12:00:00.000Z",
      normalizedReferences: [
        {
          id: "external-1",
          topic: "property_tax",
          title: "Official portal",
          url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
        },
      ],
    };

    const merged = mergeResearchSnapshot(scenario, snapshot);
    expect(merged.propertyAddress).toBe("123 Main St");
    expect(merged.monthlyRent).toBe(2500);
    expect(merged.research).toMatchObject({
      notes: "Keep these notes",
      taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
      links: [{ id: "link-1", title: "County map", url: "https://example.gov/map" }],
      externalTaxResearch: snapshot,
    });
  });
});
