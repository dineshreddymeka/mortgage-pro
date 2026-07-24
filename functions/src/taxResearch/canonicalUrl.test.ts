import { describe, expect, it } from "vitest";
import { canonicalUrlDedupeKey } from "../taxResearch/canonicalUrl.js";

describe("canonicalUrlDedupeKey", () => {
  it("strips fragments and trailing slashes", () => {
    expect(
      canonicalUrlDedupeKey("https://WWW.IRS.gov/publications/p530/#section")
    ).toBe("https://www.irs.gov/publications/p530");
    expect(canonicalUrlDedupeKey("https://www.irs.gov/publications/p530/")).toBe(
      "https://www.irs.gov/publications/p530"
    );
  });

  it("removes common tracking params but keeps meaningful query params", () => {
    expect(
      canonicalUrlDedupeKey(
        "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm?utm_source=newsletter&year=2026"
      )
    ).toBe("https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm?year=2026");
    expect(
      canonicalUrlDedupeKey(
        "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm?year=2026&utm_campaign=spring"
      )
    ).toBe("https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm?year=2026");
  });

  it("dedupes URLs that differ only by tracking params or trailing slash", () => {
    const a = canonicalUrlDedupeKey("https://www.irs.gov/publications/p530?utm_source=a");
    const b = canonicalUrlDedupeKey("https://www.irs.gov/publications/p530/?fbclid=123");
    expect(a).toBe(b);
  });

  it("returns null for disallowed URLs", () => {
    expect(canonicalUrlDedupeKey("https://evil.example/taxes")).toBeNull();
  });
});
