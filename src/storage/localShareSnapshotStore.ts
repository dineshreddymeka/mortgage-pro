import type { CreateShareSnapshotInput, ShareSnapshotRecord, ShareSnapshotStore } from "../share/shareSnapshotTypes";
import { buildShareSnapshotPayload } from "../share/buildShareSnapshot";
import { generateShareToken } from "../share/shareToken";

const LOCAL_SHARE_INDEX_KEY = "mortgage-pro:share-snapshots:index";
const LOCAL_SHARE_DOC_PREFIX = "mortgage-pro:share-snapshots:doc:";

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_SHARE_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(tokens: string[]): void {
  localStorage.setItem(LOCAL_SHARE_INDEX_KEY, JSON.stringify(tokens));
}

function readRecord(token: string): ShareSnapshotRecord | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_SHARE_DOC_PREFIX}${token}`);
    return raw ? (JSON.parse(raw) as ShareSnapshotRecord) : null;
  } catch {
    return null;
  }
}

function writeRecord(record: ShareSnapshotRecord): void {
  localStorage.setItem(`${LOCAL_SHARE_DOC_PREFIX}${record.shareToken}`, JSON.stringify(record));
}

export function createLocalShareSnapshotStore(): ShareSnapshotStore {
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
      writeRecord(record);
      const index = readIndex();
      if (!index.includes(shareToken)) writeIndex([shareToken, ...index].slice(0, 200));
      return record;
    },
    async getByToken(shareToken) {
      return readRecord(shareToken.trim());
    },
    async listByOwner(ownerUid) {
      return readIndex()
        .map((token) => readRecord(token))
        .filter((r): r is ShareSnapshotRecord => r != null && r.ownerUid === ownerUid);
    },
    async revoke(shareToken, ownerUid) {
      const existing = readRecord(shareToken);
      if (!existing || existing.ownerUid !== ownerUid) return false;
      writeRecord({ ...existing, revokedAt: Date.now() });
      return true;
    },
  };
}

export function createMemoryShareSnapshotStore(): ShareSnapshotStore {
  const docs = new Map<string, ShareSnapshotRecord>();
  return {
    async create(input) {
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
      docs.set(shareToken, record);
      return record;
    },
    async getByToken(shareToken) {
      return docs.get(shareToken.trim()) ?? null;
    },
    async listByOwner(ownerUid) {
      return [...docs.values()].filter((r) => r.ownerUid === ownerUid);
    },
    async revoke(shareToken, ownerUid) {
      const existing = docs.get(shareToken);
      if (!existing || existing.ownerUid !== ownerUid) return false;
      docs.set(shareToken, { ...existing, revokedAt: Date.now() });
      return true;
    },
  };
}
