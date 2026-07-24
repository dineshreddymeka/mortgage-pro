import { describe, expect, it } from "vitest";
import {
  addressFingerprintMatchesScenario,
  computeAddressFingerprint,
} from "../taxResearch/addressFingerprint.js";

describe("computeAddressFingerprint", () => {
  it("matches fixture format for postal + address + place id", () => {
    expect(
      computeAddressFingerprint({
        propertyPostalCode: "94107",
        propertyAddress: "123 Main St",
        propertyPlaceId: "place-abc",
      })
    ).toBe("sha256:94107|123-main-st|place-abc");
  });

  it("returns empty when no identity fields are present", () => {
    expect(computeAddressFingerprint({})).toBe("");
  });

  it("caps overly long fingerprints", () => {
    const fp = computeAddressFingerprint({
      propertyAddress: "a".repeat(500),
      propertyPostalCode: "90210",
    });
    expect(fp.length).toBeLessThanOrEqual(128);
    expect(fp.startsWith("sha256:")).toBe(true);
  });
});

describe("addressFingerprintMatchesScenario", () => {
  it("allows collection when scenario has no saved address identity", () => {
    expect(
      addressFingerprintMatchesScenario(
        { propertyAddress: "123 Main St", propertyPostalCode: "94107" },
        {}
      )
    ).toBe(true);
  });

  it("rejects mismatched scenario identity", () => {
    expect(
      addressFingerprintMatchesScenario(
        { propertyAddress: "123 Main St", propertyPostalCode: "94107" },
        { propertyAddress: "999 Other Rd", propertyPostalCode: "94107" }
      )
    ).toBe(false);
  });
});
