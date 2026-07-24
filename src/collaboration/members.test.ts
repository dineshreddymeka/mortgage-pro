import { describe, expect, it } from "vitest";
import { describeAuthUser } from "./auth";
import { hashInviteEmail, inviteMatchesUser, parsePropertyInvite } from "./members";

describe("collaboration members", () => {
  it("hashes emails consistently without storing raw values", async () => {
    const a = await hashInviteEmail("  User@Example.COM ");
    const b = await hashInviteEmail("user@example.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("matches UID and email-hash invites", async () => {
    const emailHash = await hashInviteEmail("a@b.com");
    const invite = {
      id: "x",
      propertyDocId: "p",
      ownerUid: "owner",
      houseId: "001",
      status: "pending" as const,
      createdAt: Date.now(),
      targetUid: "member-1",
    };
    expect(inviteMatchesUser(invite, "member-1", null)).toBe(true);
    expect(
      inviteMatchesUser({ ...invite, targetUid: undefined, emailHash }, "other", emailHash)
    ).toBe(true);
  });

  it("parses invite records safely", () => {
    expect(
      parsePropertyInvite(
        {
          propertyDocId: "p1",
          ownerUid: "o",
          houseId: "002",
          status: "pending",
          createdAt: 1,
          emailHash: "abc",
        },
        "id1"
      )?.houseId
    ).toBe("002");
    expect(parsePropertyInvite({ bad: true }, "id1")).toBeNull();
  });
});

describe("auth profile", () => {
  it("marks anonymous users", () => {
    const profile = describeAuthUser({
      uid: "u1",
      email: null,
      displayName: null,
      isAnonymous: true,
      providerData: [],
    } as never);
    expect(profile.provider).toBe("anonymous");
    expect(profile.isAnonymous).toBe(true);
  });
});
