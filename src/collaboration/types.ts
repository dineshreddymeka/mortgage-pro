/** Collaboration metadata stored on a house root — groundwork only, not realtime sync. */
export type ScenarioCollaborationMeta = {
  /** Monotonic revision counter bumped on each explicit save. */
  revision: number;
  updatedAt: string;
  updatedByUid?: string;
  /** Ephemeral browser tab id — helps diagnose concurrent edits later. */
  editorSessionId?: string;
  /** Last immutable share snapshot token published from this house (optional audit). */
  lastAppliedShareToken?: string;
};

export type RevisionConflictKind = "revision-mismatch" | "remote-newer";

export type RevisionConflict = {
  kind: RevisionConflictKind;
  localRevision: number;
  remoteRevision: number;
  remoteUpdatedAt: string;
  message: string;
};

export type CollaborationSaveIntent = {
  uid: string;
  editorSessionId: string;
  expectedRevision?: number;
};
