import { describe, expect, it } from "vitest";
import { isShareRouteHash, parseShareTokenFromHash } from "./parseShareRoute";
import { generateShareToken } from "./shareToken";

describe("parseShareRoute", () => {
  it("parses plausible tokens from hash", () => {
    const token = generateShareToken();
    expect(parseShareTokenFromHash(`#/share/${token}`)).toBe(token);
    expect(isShareRouteHash(`#/share/${token}`)).toBe(true);
  });

  it("rejects malformed hashes", () => {
    expect(parseShareTokenFromHash("#/share/")).toBeNull();
    expect(parseShareTokenFromHash("#/report")).toBeNull();
    expect(parseShareTokenFromHash("#/share/not-valid!")).toBeNull();
  });
});
