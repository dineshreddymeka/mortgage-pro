import { describe, expect, it } from "vitest";
import {
  DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
  findReusableTaxResearchSnapshot,
  isTaxResearchSnapshotFresh,
} from "../taxResearch/snapshotReuse.js";
import type { ExternalTaxResearchSnapshot } from "../taxResearch/types.js";

const FINGERPRINT = "sha256:94107|123-main-st";

function freshSnapshot(overrides: Partial<ExternalTaxResearchSnapshot> = {}): ExternalTaxResearchSnapshot {
  return {
    collectionStatus: "complete",
    addressFingerprint: FINGERPRINT,
    collectedAt: "2026-07-23T12:00:00.000Z",
    normalizedReferences: [
      {
        id: "ref-1",
        topic: "property_tax",
        title: "Official portal",
        url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
      },
    ],
    ...overrides,
  };
}

function scenarioWithExternalTaxResearch(snapshot: ExternalTaxResearchSnapshot): Record<string, unknown> {
  return {
    scenario: {
      propertyAddress: "123 Main St",
      propertyPostalCode: "94107",
      research: {
        notes: "manual notes",
        taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
        externalTaxResearch: snapshot,
      },
    },
  };
}

describe("findReusableTaxResearchSnapshot", () => {
  const nowMs = Date.parse("2026-07-23T14:00:00.000Z");

  it("reuses a fresh complete snapshot with matching fingerprint", () => {
    const snapshot = freshSnapshot();
    const reused = findReusableTaxResearchSnapshot({
      scenarioData: scenarioWithExternalTaxResearch(snapshot),
      addressFingerprint: FINGERPRINT,
      ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
      nowMs,
    });

    expect(reused?.collectionStatus).toBe("complete");
    expect(reused?.addressFingerprint).toBe(FINGERPRINT);
    expect(reused?.normalizedReferences).toHaveLength(1);
  });

  it("reuses partial snapshots", () => {
    const reused = findReusableTaxResearchSnapshot({
      scenarioData: scenarioWithExternalTaxResearch(freshSnapshot({ collectionStatus: "partial" })),
      addressFingerprint: FINGERPRINT,
      ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
      nowMs,
    });
    expect(reused?.collectionStatus).toBe("partial");
  });

  it("returns bounded cached snapshots", () => {
    const oversized = freshSnapshot({
      normalizedReferences: Array.from({ length: 60 }, (_, index) => ({
        id: `ref-${index}`,
        topic: "other" as const,
        title: `Title ${index}`,
        url: "https://www.irs.gov/publications/p530",
      })),
    });
    const reused = findReusableTaxResearchSnapshot({
      scenarioData: scenarioWithExternalTaxResearch(oversized),
      addressFingerprint: FINGERPRINT,
      ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
      nowMs,
    });
    expect(reused?.normalizedReferences?.length).toBe(50);
  });

  it("bypasses when forceRefresh is true", () => {
    const reused = findReusableTaxResearchSnapshot({
      scenarioData: scenarioWithExternalTaxResearch(freshSnapshot()),
      addressFingerprint: FINGERPRINT,
      ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
      forceRefresh: true,
      nowMs,
    });
    expect(reused).toBeNull();
  });

  it("bypasses stale snapshots", () => {
    const reused = findReusableTaxResearchSnapshot({
      scenarioData: scenarioWithExternalTaxResearch(
        freshSnapshot({ collectedAt: "2026-07-22T00:00:00.000Z" })
      ),
      addressFingerprint: FINGERPRINT,
      ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
      nowMs,
    });
    expect(reused).toBeNull();
  });

  it("bypasses mismatched fingerprints", () => {
    const reused = findReusableTaxResearchSnapshot({
      scenarioData: scenarioWithExternalTaxResearch(
        freshSnapshot({ addressFingerprint: "sha256:other-address" })
      ),
      addressFingerprint: FINGERPRINT,
      ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
      nowMs,
    });
    expect(reused).toBeNull();
  });

  it("bypasses failed or pending snapshots", () => {
    expect(
      findReusableTaxResearchSnapshot({
        scenarioData: scenarioWithExternalTaxResearch(freshSnapshot({ collectionStatus: "failed" })),
        addressFingerprint: FINGERPRINT,
        ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
        nowMs,
      })
    ).toBeNull();
    expect(
      findReusableTaxResearchSnapshot({
        scenarioData: scenarioWithExternalTaxResearch(freshSnapshot({ collectionStatus: "pending" })),
        addressFingerprint: FINGERPRINT,
        ttlSeconds: DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS,
        nowMs,
      })
    ).toBeNull();
  });
});

describe("isTaxResearchSnapshotFresh", () => {
  it("respects TTL boundaries", () => {
    const snapshot = freshSnapshot({ collectedAt: "2026-07-23T12:00:00.000Z" });
    const ttlSeconds = 6 * 60 * 60;
    expect(isTaxResearchSnapshotFresh(snapshot, ttlSeconds, Date.parse("2026-07-23T17:59:59.000Z"))).toBe(true);
    expect(isTaxResearchSnapshotFresh(snapshot, ttlSeconds, Date.parse("2026-07-23T18:00:01.000Z"))).toBe(false);
  });
});
