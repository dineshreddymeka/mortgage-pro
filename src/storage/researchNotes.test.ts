import { describe, expect, it } from "vitest";
import {
  isCuratedReferenceSaved,
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
