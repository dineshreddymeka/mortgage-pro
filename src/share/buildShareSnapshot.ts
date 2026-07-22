import type { AppPersisted } from "../storage/mortgageState";
import { buildFullScenarioExport } from "../lib/scenarioExport";
import type { CreateShareSnapshotInput, ShareSnapshotExportDoc, ShareSnapshotPayload } from "./shareSnapshotTypes";
import { SHARE_SNAPSHOT_KIND, SHARE_SNAPSHOT_VERSION } from "./shareSnapshotTypes";

export function hashSharePayload(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 33) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildShareSnapshotPayload(input: {
  exportDoc: ShareSnapshotExportDoc;
  houseLabel: string;
  houseId?: string;
  propertyDocId?: string;
  createdAt?: string;
}): ShareSnapshotPayload {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const exportDoc = Object.freeze(structuredClone(input.exportDoc)) as ShareSnapshotExportDoc;
  return Object.freeze({
    kind: SHARE_SNAPSHOT_KIND,
    version: SHARE_SNAPSHOT_VERSION,
    createdAt,
    houseLabel: input.houseLabel,
    houseId: input.houseId,
    propertyDocId: input.propertyDocId,
    export: exportDoc,
    contentHash: hashSharePayload({ export: exportDoc, createdAt }),
  });
}

export function buildShareSnapshotInputFromScenario(
  state: AppPersisted,
  ownerUid: string,
  meta: { houseLabel: string; houseId?: string; propertyDocId?: string; houseNumber?: number; name?: string },
  expiresAt?: number | null
): CreateShareSnapshotInput {
  return {
    ownerUid,
    houseLabel: meta.houseLabel,
    houseId: meta.houseId,
    propertyDocId: meta.propertyDocId,
    exportDoc: buildFullScenarioExport(state, {
      id: meta.houseId,
      houseId: meta.houseId,
      houseNumber: meta.houseNumber,
      name: meta.name ?? meta.houseLabel,
    }),
    expiresAt: expiresAt ?? null,
  };
}

export function validateShareSnapshotPayload(payload: unknown): payload is ShareSnapshotPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as ShareSnapshotPayload;
  if (p.kind !== SHARE_SNAPSHOT_KIND || p.version !== SHARE_SNAPSHOT_VERSION) return false;
  if (typeof p.createdAt !== "string" || typeof p.houseLabel !== "string") return false;
  if (typeof p.contentHash !== "string" || !p.export) return false;
  return hashSharePayload({ export: p.export, createdAt: p.createdAt }) === p.contentHash;
}

export function isShareSnapshotActive(record: { revokedAt: number | null; expiresAt: number | null }, now = Date.now()): boolean {
  if (record.revokedAt != null) return false;
  if (record.expiresAt != null && now >= record.expiresAt) return false;
  return true;
}
