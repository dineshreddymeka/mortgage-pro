import { describe, expect, it } from "vitest";
import type { TaxResourceEntry } from "../lib/taxResourcePack";
import {
  formatTaxResearchFreshness,
  isExternalReferenceSaved,
  isTaxResearchSnapshotFresh,
  mergeExternalSnapshotIntoResearch,
  mergeTaxReferenceRows,
  taxIssueFromExternal,
} from "./mergeReferences";
import type { ExternalTaxResearchPersisted } from "../storage/researchNotes";

const curated: TaxResourceEntry[] = [
  {
    id: "irs-pub-530",
    topic: "property_tax",
    jurisdiction: "federal",
    title: "IRS Pub 530",
    url: "https://www.irs.gov/publications/p530?utm_source=test",
    source: "IRS",
    blurb: "Homeowner tax basics",
  },
  {
    id: "ca-property-tax",
    topic: "property_tax",
    jurisdiction: "state",
    title: "California property tax overview",
    url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
    source: "CDTFA",
    blurb: "State overview",
  },
];

describe("mergeTaxReferenceRows", () => {
  it("dedupes curated and external references by canonical URL", () => {
    const rows = mergeTaxReferenceRows(curated, [
      {
        id: "ext-irs",
        topic: "property_tax",
        title: "IRS Pub 530 (live)",
        url: "https://www.irs.gov/publications/p530/",
        jurisdiction: "federal",
        linkStatus: "ok",
        retrievedAt: "2026-07-23T12:00:00.000Z",
      },
      {
        id: "ext-county",
        topic: "property_tax",
        title: "County assessor portal",
        url: "https://assessor.example.gov/portal",
        jurisdiction: "county",
        linkStatus: "redirected",
      },
    ]);

    expect(rows).toHaveLength(3);
    const mergedIrs = rows.find((row) => row.curated?.id === "irs-pub-530");
    expect(mergedIrs?.kind).toBe("both");
    expect(mergedIrs?.external?.linkStatus).toBe("ok");
    expect(rows.some((row) => row.kind === "external" && row.external?.id === "ext-county")).toBe(true);
  });
});

describe("mergeExternalSnapshotIntoResearch", () => {
  it("preserves manual taxIssues while replacing externalTaxResearch", () => {
    const research = {
      notes: "Keep",
      taxIssues: [{ id: "manual-1", topic: "qbi" as const, title: "Saved issue", addedAt: "2026-01-01T00:00:00.000Z" }],
    };
    const snapshot: ExternalTaxResearchPersisted = {
      collectionStatus: "partial",
      addressFingerprint: "fp-123",
      collectedAt: "2026-07-23T12:00:00.000Z",
      errors: [{ code: "COUNTY", message: "County portal unavailable" }],
    };

    const merged = mergeExternalSnapshotIntoResearch(research, snapshot);
    expect(merged.taxIssues).toEqual(research.taxIssues);
    expect(merged.notes).toBe("Keep");
    expect(merged.externalTaxResearch).toEqual(snapshot);
  });
});

describe("freshness helpers", () => {
  const snapshot: ExternalTaxResearchPersisted = {
    collectionStatus: "complete",
    addressFingerprint: "fp-123",
    collectedAt: "2026-07-23T12:00:00.000Z",
  };

  it("detects fresh and stale snapshots", () => {
    expect(isTaxResearchSnapshotFresh(snapshot, 21_600_000, Date.parse("2026-07-23T15:00:00.000Z"))).toBe(true);
    expect(isTaxResearchSnapshotFresh(snapshot, 21_600_000, Date.parse("2026-07-24T00:00:00.000Z"))).toBe(false);
  });

  it("formats freshness labels", () => {
    expect(formatTaxResearchFreshness(snapshot, 21_600_000, Date.parse("2026-07-23T13:00:00.000Z"))).toMatch(
      /^Fresh · collected /
    );
    expect(formatTaxResearchFreshness(snapshot, 21_600_000, Date.parse("2026-07-24T00:00:00.000Z"))).toMatch(
      /^Stale · collected /
    );
  });
});

describe("external library helpers", () => {
  it("taxIssueFromExternal and isExternalReferenceSaved match by URL or externalRefId", () => {
    const ref = {
      id: "ext-1",
      topic: "property_tax" as const,
      title: "County portal",
      url: "https://assessor.example.gov/portal?utm_source=x",
      externalRefId: "county-portal",
      excerpt: "Live excerpt",
    };
    const saved = taxIssueFromExternal(ref);
    expect(saved.curatedRefId).toBe("county-portal");
    expect(saved.notes).toBe("Live excerpt");
    expect(isExternalReferenceSaved([saved], ref)).toBe(true);
    expect(
      isExternalReferenceSaved(
        [{ id: "x", topic: "property_tax", title: "Saved", url: "https://assessor.example.gov/portal/", addedAt: "2026-01-01T00:00:00.000Z" }],
        ref
      )
    ).toBe(true);
  });
});
