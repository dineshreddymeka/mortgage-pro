/** Collaboration metadata stored on a house root — not realtime sync. */
export type ScenarioCollaborationMeta = {
  revision: number;
  updatedAt: string;
  updatedByUid?: string;
  editorSessionId?: string;
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
  forceOverwrite?: boolean;
};

export type HouseAccessRole = "owner" | "member";

export type HouseMemberRecord = {
  role: "member";
  addedAt: string;
  addedBy: string;
  via?: "uid" | "email";
  label?: string;
};

export type HouseMembersMeta = Record<string, HouseMemberRecord>;

export type PropertyInviteStatus = "pending" | "accepted" | "revoked";

export type PropertyInviteRecord = {
  id: string;
  propertyDocId: string;
  ownerUid: string;
  houseId: string;
  status: PropertyInviteStatus;
  createdAt: number;
  targetUid?: string;
  emailHash?: string;
  expiresAt?: number;
  acceptedAt?: number;
  acceptedByUid?: string;
};

export type HouseCollaborationView = {
  ownerUid: string;
  houseId: string;
  memberUids: string[];
  members: HouseMembersMeta;
  accessRole: HouseAccessRole;
  pendingInvites: PropertyInviteRecord[];
};
