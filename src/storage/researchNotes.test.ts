import { describe, expect, it } from "vitest";
import { parseResearchNotes } from "./researchNotes";

describe("parseResearchNotes", () => {
  it("returns undefined for empty payloads", () => {
    expect(parseResearchNotes(undefined)).toBeUndefined();
    expect(parseResearchNotes({})).toBeUndefined();
    expect(parseResearchNotes({ notes: "   ", links: [], comps: [], docs: [] })).toBeUndefined();
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
});
