import { describe, expect, it } from "vitest";
import {
  bumpCollaborationMeta,
  createInitialCollaborationMeta,
  detectRevisionConflict,
  parseCollaborationMeta,
} from "./revisionConflict";

describe("collaboration revision groundwork", () => {
  it("bumps monotonic revision metadata", () => {
    const first = createInitialCollaborationMeta("uid-1", "sess-a");
    const second = bumpCollaborationMeta(first, "uid-1", "sess-b");
    expect(second.revision).toBe(2);
    expect(second.updatedByUid).toBe("uid-1");
    expect(second.editorSessionId).toBe("sess-b");
  });

  it("detects expected-revision mismatch", () => {
    const remote = bumpCollaborationMeta(createInitialCollaborationMeta("u", "s"), "u", "s2");
    const conflict = detectRevisionConflict(createInitialCollaborationMeta("u", "s"), remote, 1);
    expect(conflict?.kind).toBe("revision-mismatch");
  });

  it("detects remote-newer gap without realtime merge", () => {
    const local = createInitialCollaborationMeta("u", "s");
    const remote = { ...local, revision: local.revision + 3 };
    const conflict = detectRevisionConflict(local, remote);
    expect(conflict?.kind).toBe("remote-newer");
    expect(conflict?.message).toMatch(/not available yet/i);
  });

  it("parses collaboration meta safely", () => {
    expect(parseCollaborationMeta({ revision: 2, updatedAt: "2026-01-01T00:00:00.000Z" })?.revision).toBe(2);
    expect(parseCollaborationMeta(null)).toBeNull();
  });
});
