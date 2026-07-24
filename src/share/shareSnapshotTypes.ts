import { buildFullScenarioExport } from "../lib/scenarioExport";

export const SHARE_SNAPSHOT_KIND = "property-pro-share-snapshot" as const;
export const SHARE_SNAPSHOT_VERSION = 1 as const;
export const SHARE_SNAPSHOTS_COLLECTION = "shareSnapshots";

export type ShareSnapshotExportDoc = ReturnType<typeof buildFullScenarioExport>;

export type ShareSnapshotPayload = {
  kind: typeof SHARE_SNAPSHOT_KIND;
  version: typeof SHARE_SNAPSHOT_VERSION;
  createdAt: string;
  houseLabel: string;
  houseId?: string;
  propertyDocId?: string;
  export: ShareSnapshotExportDoc;
  contentHash: string;
};

export type ShareSnapshotRecord = {
  shareToken: string;
  ownerUid: string;
  propertyDocId?: string;
  houseId?: string;
  createdAt: number;
  revokedAt: number | null;
  expiresAt: number | null;
  payload: ShareSnapshotPayload;
};

export type CreateShareSnapshotInput = {
  ownerUid: string;
  houseLabel: string;
  houseId?: string;
  propertyDocId?: string;
  exportDoc: ShareSnapshotExportDoc;
  expiresAt?: number | null;
};

export type ShareSnapshotStore = {
  create(input: CreateShareSnapshotInput): Promise<ShareSnapshotRecord>;
  getByToken(shareToken: string): Promise<ShareSnapshotRecord | null>;
  listByOwner(ownerUid: string): Promise<ShareSnapshotRecord[]>;
  revoke(shareToken: string, ownerUid: string): Promise<boolean>;
};
