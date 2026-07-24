import { describe, expect, it } from "vitest";
import { resolvePropertyAccess } from "../taxResearch/propertyAccess.js";

describe("resolvePropertyAccess", () => {
  it("returns owner for property owner uid", () => {
    expect(resolvePropertyAccess({ userId: "owner-1", memberUids: ["member-1"] }, "owner-1")).toBe("owner");
  });

  it("returns member for listed collaborator", () => {
    expect(resolvePropertyAccess({ userId: "owner-1", memberUids: ["member-1"] }, "member-1")).toBe("member");
  });

  it("returns null for unrelated users", () => {
    expect(resolvePropertyAccess({ userId: "owner-1", memberUids: ["member-1"] }, "stranger")).toBeNull();
  });
});
