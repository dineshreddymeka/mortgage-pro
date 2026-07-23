import { describe, expect, it } from "vitest";
import { canonicalUrlDedupeKey } from "./canonicalUrl";

describe("canonicalUrlDedupeKey", () => {
  it("normalizes host, path, and tracking params", () => {
    expect(
      canonicalUrlDedupeKey("https://WWW.IRS.gov/publications/p530/#section")
    ).toBe("https://www.irs.gov/publications/p530");
    expect(canonicalUrlDedupeKey("https://www.irs.gov/publications/p530/")).toBe(
      "https://www.irs.gov/publications/p530"
    );
  });

  it("treats tracking query variants as the same key", () => {
    const a = canonicalUrlDedupeKey("https://www.irs.gov/publications/p530?utm_source=a");
    const b = canonicalUrlDedupeKey("https://www.irs.gov/publications/p530/?fbclid=123");
    expect(a).toBe(b);
  });
});
