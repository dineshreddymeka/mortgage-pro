import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rules = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../firestore.rules"), "utf8");

describe("firestore.rules collaboration security", () => {
  it("allows owners and members to read properties", () => {
    expect(rules).toContain("canReadProperty()");
    expect(rules).toContain("isPropertyMember()");
    expect(rules).toContain("memberUids");
  });

  it("restricts member updates to scenario fields", () => {
    expect(rules).toContain("memberScenarioOnlyUpdate()");
    expect(rules).toContain("request.resource.data.userId == resource.data.userId");
  });

  it("allows only owners to delete houses", () => {
    expect(rules).toContain("allow delete: if isPropertyOwner()");
  });

  it("defines propertyInvites with email hash or target UID", () => {
    expect(rules).toContain("match /propertyInvites/{inviteId}");
    expect(rules).toContain("validInviteTarget()");
    expect(rules).toContain("inviteeAcceptsInvite()");
  });

  it("limits pending email-invite reads to Google-linked accounts", () => {
    expect(rules).toContain("canReadInvite()");
    expect(rules).toContain("sign_in_provider == 'google.com'");
  });

  it("keeps share snapshot read-only rules intact", () => {
    expect(rules).toContain("match /shareSnapshots/{shareToken}");
    expect(rules).toContain("allow read: if true;");
    expect(rules).toContain("onlyShareSnapshotMetadataChanged");
  });
});
