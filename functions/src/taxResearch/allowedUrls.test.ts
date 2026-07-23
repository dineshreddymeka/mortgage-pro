import { describe, expect, it } from "vitest";
import { isAllowedUrl, normalizeAllowedUrl } from "../taxResearch/allowedUrls.js";

describe("normalizeAllowedUrl", () => {
  it("accepts official https .gov links", () => {
    expect(normalizeAllowedUrl("https://www.irs.gov/publications/p946")).toBe(
      "https://www.irs.gov/publications/p946"
    );
    expect(normalizeAllowedUrl("https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm")).toBe(
      "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm"
    );
  });

  it("rejects arbitrary URLs", () => {
    expect(normalizeAllowedUrl("http://www.irs.gov/publications/p946")).toBeNull();
    expect(normalizeAllowedUrl("https://evil.example/phish")).toBeNull();
    expect(normalizeAllowedUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeAllowedUrl("")).toBeNull();
  });
});

describe("isAllowedUrl", () => {
  it("returns true only for allowlisted hosts", () => {
    expect(isAllowedUrl("https://revenue.alabama.gov/property-tax/")).toBe(true);
    expect(isAllowedUrl("https://tracking.example/")).toBe(false);
  });
});
