import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rules = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../firestore.rules"), "utf8");

describe("firestore.rules shareSnapshots security", () => {
  it("uses token doc path with owner-only create and open read", () => {
    expect(rules).toContain("match /shareSnapshots/{shareToken}");
    expect(rules).toContain("request.resource.data.ownerUid == request.auth.uid");
    expect(rules).toMatch(/allow read: if true;/);
  });

  it("blocks payload mutation on update", () => {
    expect(rules).toContain("request.resource.data.payload == resource.data.payload");
    expect(rules).toContain("onlyShareSnapshotMetadataChanged");
  });

  it("validates optional collaboration metadata on properties", () => {
    expect(rules).toContain("validCollaborationMetaOptional");
    expect(rules).toContain("collaboration.revision is int");
  });
});
