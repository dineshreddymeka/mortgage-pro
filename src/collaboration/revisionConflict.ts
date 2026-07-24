import type { RevisionConflict, ScenarioCollaborationMeta } from "./types";

export function createInitialCollaborationMeta(
  uid: string,
  editorSessionId: string,
  now = new Date().toISOString()
): ScenarioCollaborationMeta {
  return {
    revision: 1,
    updatedAt: now,
    updatedByUid: uid,
    editorSessionId,
  };
}

export function bumpCollaborationMeta(
  prev: ScenarioCollaborationMeta | null | undefined,
  uid: string,
  editorSessionId: string,
  patch?: Partial<Pick<ScenarioCollaborationMeta, "lastAppliedShareToken">>,
  now = new Date().toISOString()
): ScenarioCollaborationMeta {
  const base = prev ?? createInitialCollaborationMeta(uid, editorSessionId, now);
  return {
    ...base,
    revision: Math.max(1, base.revision + 1),
    updatedAt: now,
    updatedByUid: uid,
    editorSessionId,
    ...patch,
  };
}

export function detectRevisionConflict(
  local: ScenarioCollaborationMeta | null | undefined,
  remote: ScenarioCollaborationMeta | null | undefined,
  expectedRevision?: number
): RevisionConflict | null {
  if (!remote) return null;
  const localRev = local?.revision ?? 0;
  const remoteRev = remote.revision;
  if (expectedRevision != null && remoteRev !== expectedRevision) {
    return {
      kind: "revision-mismatch",
      localRevision: localRev,
      remoteRevision: remoteRev,
      remoteUpdatedAt: remote.updatedAt,
      message: `Remote revision ${remoteRev} does not match expected ${expectedRevision}. Reload or save as a new house before continuing.`,
    };
  }
  if (local && remoteRev > localRev + 1) {
    return {
      kind: "remote-newer",
      localRevision: localRev,
      remoteRevision: remoteRev,
      remoteUpdatedAt: remote.updatedAt,
      message: `Another session saved revision ${remoteRev} while you were editing (local ${localRev}). Realtime merge is not available yet — reload to pick up remote changes.`,
    };
  }
  return null;
}

export function parseCollaborationMeta(raw: unknown): ScenarioCollaborationMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const revision = typeof o.revision === "number" && Number.isFinite(o.revision) ? o.revision : null;
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : null;
  if (revision == null || !updatedAt) return null;
  return {
    revision: Math.max(0, Math.floor(revision)),
    updatedAt,
    updatedByUid: typeof o.updatedByUid === "string" ? o.updatedByUid : undefined,
    editorSessionId: typeof o.editorSessionId === "string" ? o.editorSessionId : undefined,
    lastAppliedShareToken:
      typeof o.lastAppliedShareToken === "string" ? o.lastAppliedShareToken : undefined,
  };
}
