import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import type { CreateShareSnapshotInput, ShareSnapshotRecord, ShareSnapshotStore } from "../share/shareSnapshotTypes";
import { SHARE_SNAPSHOTS_COLLECTION } from "../share/shareSnapshotTypes";
import { buildShareSnapshotPayload } from "../share/buildShareSnapshot";
import { generateShareToken } from "../share/shareToken";

function asMillis(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseRecord(id: string, data: Record<string, unknown>): ShareSnapshotRecord | null {
  const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : "";
  const payload = data.payload;
  if (!ownerUid || !payload || typeof payload !== "object") return null;
  return {
    shareToken: id,
    ownerUid,
    propertyDocId: typeof data.propertyDocId === "string" ? data.propertyDocId : undefined,
    houseId: typeof data.houseId === "string" ? data.houseId : undefined,
    createdAt: asMillis(data.createdAt),
    revokedAt: data.revokedAt == null ? null : asMillis(data.revokedAt),
    expiresAt: data.expiresAt == null ? null : asMillis(data.expiresAt),
    payload: payload as ShareSnapshotRecord["payload"],
  };
}

export function createFirestoreShareSnapshotStore(): ShareSnapshotStore | null {
  const fb = getFirebase();
  if (!fb) return null;
  const { db } = fb;
  return {
    async create(input: CreateShareSnapshotInput) {
      const shareToken = generateShareToken();
      const createdAt = Date.now();
      const payload = buildShareSnapshotPayload({
        exportDoc: input.exportDoc,
        houseLabel: input.houseLabel,
        houseId: input.houseId,
        propertyDocId: input.propertyDocId,
        createdAt: new Date(createdAt).toISOString(),
      });
      const record: ShareSnapshotRecord = {
        shareToken,
        ownerUid: input.ownerUid,
        propertyDocId: input.propertyDocId,
        houseId: input.houseId,
        createdAt,
        revokedAt: null,
        expiresAt: input.expiresAt ?? null,
        payload,
      };
      await setDoc(doc(db, SHARE_SNAPSHOTS_COLLECTION, shareToken), {
        ownerUid: record.ownerUid,
        propertyDocId: record.propertyDocId ?? null,
        houseId: record.houseId ?? null,
        createdAt: record.createdAt,
        revokedAt: null,
        expiresAt: record.expiresAt,
        payload: record.payload,
        immutable: true,
      });
      return record;
    },
    async getByToken(shareToken) {
      const snap = await getDoc(doc(db, SHARE_SNAPSHOTS_COLLECTION, shareToken.trim()));
      return snap.exists() ? parseRecord(snap.id, snap.data() as Record<string, unknown>) : null;
    },
    async listByOwner(ownerUid) {
      const result = await getDocs(query(collection(db, SHARE_SNAPSHOTS_COLLECTION), where("ownerUid", "==", ownerUid)));
      return result.docs
        .map((d) => parseRecord(d.id, d.data() as Record<string, unknown>))
        .filter((r): r is ShareSnapshotRecord => r != null);
    },
    async revoke(shareToken, ownerUid) {
      const ref = doc(db, SHARE_SNAPSHOTS_COLLECTION, shareToken.trim());
      const snap = await getDoc(ref);
      if (!snap.exists() || (snap.data() as Record<string, unknown>).ownerUid !== ownerUid) return false;
      await updateDoc(ref, { revokedAt: Date.now() });
      return true;
    },
  };
}
