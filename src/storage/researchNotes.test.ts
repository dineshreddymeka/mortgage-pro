import { describe, expect, it } from "vitest";
import {
  isCuratedReferenceSaved,
  parseExternalTaxResearch,
  parseResearchNotes,
  taxIssueFromCurated,
} from "./researchNotes";

describe("parseResearchNotes", () => {
  it("returns undefined for empty payloads", () => {
    expect(parseResearchNotes(undefined)).toBeUndefined();
    expect(parseResearchNotes({})).toBeUndefined();
    expect(parseResearchNotes({ notes: "   ", links: [], comps: [], docs: [], taxIssues: [] })).toBeUndefined();
  });

  it("keeps notes, links, comps, and docs with safe trimming", () => {
    const parsed = parseResearchNotes({
      notes: "  Inspect roof  ",
      links: [{ id: "l1", url: "https://example.com/listing", title: " MLS ", kind: "listing" }],
      comps: [{ id: "c1", label: " 123 Main ", price: 510_000, address: " Austin " }],
      docs: [{ id: "d1", title: " Inspection ", url: "https://drive.example/doc", note: " PDF " }],
    });
    expect(parsed?.notes).toBe("Inspect roof");
    expect(parsed?.links?.[0]).toMatchObject({
      id: "l1",
      url: "https://example.com/listing",
      title: "MLS",
      kind: "listing",
    });
    expect(parsed?.comps?.[0]).toMatchObject({
      id: "c1",
      label: "123 Main",
      price: 510_000,
      address: "Austin",
    });
    expect(parsed?.docs?.[0]).toMatchObject({
      id: "d1",
      title: "Inspection",
      url: "https://drive.example/doc",
      note: "PDF",
    });
  });

  it("drops invalid link and comp rows", () => {
    const parsed = parseResearchNotes({
      links: [{ id: "bad", title: "no url" }, { id: "ok", url: "https://ok.example" }],
      comps: [{ id: "bad", price: 1 }, { id: "ok", label: "Comp A" }],
    });
    expect(parsed?.links).toHaveLength(1);
    expect(parsed?.comps).toHaveLength(1);
  });

  it("keeps taxIssues with topic normalization", () => {
    const parsed = parseResearchNotes({
      taxIssues: [
        {
          id: "t1",
          topic: "depreciation",
          jurisdiction: "federal",
          title: " Pub 946 ",
          url: "https://www.irs.gov/publications/p946",
          source: " IRS ",
          notes: " reference ",
        },
        { id: "bad", topic: "nope", title: "" },
      ],
    });
    expect(parsed?.taxIssues).toHaveLength(1);
    expect(parsed?.taxIssues?.[0]).toMatchObject({
      id: "t1",
      topic: "depreciation",
      jurisdiction: "federal",
      title: "Pub 946",
      source: "IRS",
      notes: "reference",
    });
  });

  it("defaults unknown tax topic to other", () => {
    const parsed = parseResearchNotes({
      taxIssues: [{ id: "t2", topic: "invalid-topic", title: "Custom note" }],
    });
    expect(parsed?.taxIssues?.[0]?.topic).toBe("other");
  });

  it("keeps curatedRefId on saved tax issues", () => {
    const parsed = parseResearchNotes({
      taxIssues: [
        {
          id: "t3",
          topic: "qbi",
          title: "QBI FAQ",
          curatedRefId: "irs-qbi-faq",
        },
      ],
    });
    expect(parsed?.taxIssues?.[0]?.curatedRefId).toBe("irs-qbi-faq");
  });

  it("keeps externalTaxResearch separate from manual taxIssues", () => {
    const parsed = parseResearchNotes({
      taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved by user" }],
      externalTaxResearch: {
        collectionStatus: "complete",
        addressFingerprint: "fp-123",
        collectedAt: "2026-01-20T12:00:00.000Z",
        normalizedReferences: [
          {
            id: "auto-1",
            topic: "property_tax",
            title: "County assessor",
            source: "collector",
          },
        ],
      },
    });
    expect(parsed?.taxIssues).toHaveLength(1);
    expect(parsed?.taxIssues?.[0]?.title).toBe("Saved by user");
    expect(parsed?.externalTaxResearch?.collectionStatus).toBe("complete");
    expect(parsed?.externalTaxResearch?.normalizedReferences).toHaveLength(1);
  });

  it("returns research when only externalTaxResearch is present", () => {
    const parsed = parseResearchNotes({
      externalTaxResearch: {
        collectionStatus: "failed",
        addressFingerprint: "fp-only",
        collectedAt: "2026-01-20T12:00:00.000Z",
        errors: [{ code: "COUNTY_LOOKUP", message: "County portal unavailable" }],
      },
    });
    expect(parsed?.externalTaxResearch?.collectionStatus).toBe("failed");
    expect(parsed?.taxIssues).toBeUndefined();
  });
});

describe("parseExternalTaxResearch", () => {
  it("returns undefined for empty or invalid payloads", () => {
    expect(parseExternalTaxResearch(undefined)).toBeUndefined();
    expect(parseExternalTaxResearch({})).toBeUndefined();
    expect(parseExternalTaxResearch({ collectionStatus: "complete" })).toBeUndefined();
    expect(parseExternalTaxResearch([])).toBeUndefined();
  });

  it("normalizes status, provenance, references, and errors with bounds", () => {
    const longTitle = "x".repeat(300);
    const refs = Array.from({ length: 60 }, (_, index) => ({
      id: `ref-${index}`,
      topic: "property_tax",
      title: `Ref ${index}`,
    }));
    const errors = Array.from({ length: 25 }, (_, index) => ({
      code: `E${index}`,
      message: `Error ${index}`,
    }));
    const parsed = parseExternalTaxResearch({
      collectionStatus: " COMPLETE ",
      addressFingerprint: `  fp-${"a".repeat(200)}  `,
      collectedAt: "2026-01-20T12:00:00.000Z",
      sourceProvenance: {
        provider: " tax-pack ",
        sources: Array.from({ length: 25 }, (_, index) => `https://example.com/${index}`),
      },
      normalizedReferences: [
        {
          id: "r1",
          topic: "invalid",
          title: `  ${longTitle}  `,
          url: "https://example.com/ref",
          jurisdiction: "state",
          normalizedKey: " state:ca:property_tax ",
          excerpt: `  ${"e".repeat(2500)}  `,
          publishedAt: "2024-01-15T00:00:00.000Z",
          retrievedAt: "2026-01-20T12:00:00.000Z",
          linkStatus: " REDIRECTED ",
        },
        { id: "bad", title: "" },
      ],
      errors: [
        { code: " LOOKUP ", message: ` ${"m".repeat(800)} `, source: " county ", at: "2026-01-20T12:00:00.000Z" },
        { code: "", message: "missing code" },
        ...errors,
      ],
    });

    expect(parsed?.collectionStatus).toBe("complete");
    expect(parsed?.addressFingerprint).toHaveLength(128);
    expect(parsed?.sourceProvenance?.provider).toBe("tax-pack");
    expect(parsed?.sourceProvenance?.sources).toHaveLength(20);
    expect(parsed?.normalizedReferences).toHaveLength(1);
    expect(parsed?.normalizedReferences?.[0]?.title).toHaveLength(200);
    expect(parsed?.normalizedReferences?.[0]?.topic).toBe("other");
    expect(parsed?.normalizedReferences?.[0]?.normalizedKey).toBe("state:ca:property_tax");
    expect(parsed?.normalizedReferences?.[0]?.excerpt).toHaveLength(2000);
    expect(parsed?.normalizedReferences?.[0]?.publishedAt).toBe("2024-01-15T00:00:00.000Z");
    expect(parsed?.normalizedReferences?.[0]?.retrievedAt).toBe("2026-01-20T12:00:00.000Z");
    expect(parsed?.normalizedReferences?.[0]?.linkStatus).toBe("redirected");
    expect(parsed?.errors).toHaveLength(20);
    expect(parsed?.errors?.[0]?.code).toBe("LOOKUP");
    expect(parsed?.errors?.[0]?.message).toHaveLength(500);
    expect(parsed?.errors?.[0]?.source).toBe("county");
  });

  it("normalizes reference excerpt, dates, and linkStatus with safe defaults", () => {
    const parsed = parseExternalTaxResearch({
      collectionStatus: "complete",
      addressFingerprint: "fp-ref-fields",
      collectedAt: "2026-01-20T12:00:00.000Z",
      normalizedReferences: [
        {
          id: "r2",
          topic: "property_tax",
          title: "Assessor portal",
          linkStatus: "dead-link",
          publishedAt: "not-a-date",
          retrievedAt: "",
        },
        {
          id: "r3",
          topic: "property_tax",
          title: "Working link",
          linkStatus: "broken",
          retrievedAt: "2026-01-21T08:00:00.000Z",
        },
      ],
    });

    expect(parsed?.normalizedReferences?.[0]?.linkStatus).toBe("unknown");
    expect(parsed?.normalizedReferences?.[0]?.publishedAt).toBeUndefined();
    expect(parsed?.normalizedReferences?.[0]?.retrievedAt).toBeUndefined();
    expect(parsed?.normalizedReferences?.[1]?.linkStatus).toBe("broken");
    expect(parsed?.normalizedReferences?.[1]?.retrievedAt).toBe("2026-01-21T08:00:00.000Z");
  });

  it("round-trips through parseResearchNotes", () => {
    const block = {
      collectionStatus: "partial" as const,
      addressFingerprint: "fp-round-trip",
      collectedAt: "2026-01-21T09:00:00.000Z",
      errors: [{ code: "STATE_PACK", message: "No state-specific pack" }],
    };
    const parsed = parseResearchNotes({ externalTaxResearch: block });
    expect(parsed?.externalTaxResearch).toEqual(parseExternalTaxResearch(block));
  });
});

describe("tax issue helpers", () => {
  it("taxIssueFromCurated stores curatedRefId and blurb as notes", () => {
    const row = taxIssueFromCurated({
      id: "irs-pub-527",
      topic: "rental_income",
      title: "Pub 527",
      url: "https://www.irs.gov/publications/p527",
      source: "IRS",
      blurb: "Residential rental property",
      jurisdiction: "federal",
    });
    expect(row.curatedRefId).toBe("irs-pub-527");
    expect(row.notes).toBe("Residential rental property");
    expect(row.jurisdiction).toBe("federal");
  });

  it("isCuratedReferenceSaved matches by curatedRefId or url", () => {
    const saved = [
      taxIssueFromCurated({
        id: "irs-1031",
        topic: "1031",
        title: "1031 exchange",
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips",
        source: "IRS",
      }),
    ];
    expect(
      isCuratedReferenceSaved(saved, {
        id: "irs-1031",
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips",
      })
    ).toBe(true);
    expect(
      isCuratedReferenceSaved(saved, {
        id: "other-id",
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips",
      })
    ).toBe(true);
    expect(isCuratedReferenceSaved(saved, { id: "missing", url: "https://example.com" })).toBe(false);
  });
});
