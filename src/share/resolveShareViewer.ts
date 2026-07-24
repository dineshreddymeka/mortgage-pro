import type { ShareSnapshotRecord } from "./shareSnapshotTypes";
import { isShareSnapshotActive, validateShareSnapshotPayload } from "./buildShareSnapshot";
import { isPlausibleShareToken } from "./shareToken";
import type { AppPersisted } from "../storage/mortgageState";
import { parseMortgageState } from "../storage/mortgageState";
import type { ShareSnapshotExportDoc } from "./shareSnapshotTypes";

export type ShareViewerStatus =
  | "invalid-token"
  | "not-found"
  | "revoked"
  | "expired"
  | "hash-mismatch"
  | "ready";

export type ShareViewerResolution =
  | { status: Exclude<ShareViewerStatus, "ready">; record?: ShareSnapshotRecord }
  | { status: "ready"; record: ShareSnapshotRecord; state: AppPersisted; exportDoc: ShareSnapshotExportDoc };

function scenarioFromExport(exportDoc: ShareSnapshotExportDoc): AppPersisted | null {
  const scenario = (exportDoc as { scenario?: unknown }).scenario;
  if (!scenario || typeof scenario !== "object") return null;
  try {
    return parseMortgageState(JSON.stringify(scenario));
  } catch {
    return null;
  }
}

export function resolveShareViewerRecord(
  token: string | null,
  record: ShareSnapshotRecord | null | undefined,
  now = Date.now()
): ShareViewerResolution {
  if (!token || !isPlausibleShareToken(token)) return { status: "invalid-token" };
  if (!record) return { status: "not-found" };
  if (record.revokedAt != null) return { status: "revoked", record };
  if (record.expiresAt != null && now >= record.expiresAt) return { status: "expired", record };
  if (!validateShareSnapshotPayload(record.payload)) return { status: "hash-mismatch", record };
  if (!isShareSnapshotActive(record, now)) {
    if (record.revokedAt != null) return { status: "revoked", record };
    return { status: "expired", record };
  }
  const state = scenarioFromExport(record.payload.export);
  if (!state) return { status: "hash-mismatch", record };
  return { status: "ready", record, state, exportDoc: record.payload.export };
}
