import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { ensureFirebaseUser as ensureAuthUser } from "../collaboration/auth";
import { readMembersFromDoc } from "../collaboration/firestoreMembers";
import { resolvePropertyAccess } from "../collaboration/propertyAccess";
import type { HouseAccessRole, RevisionConflict, ScenarioCollaborationMeta } from "../collaboration/types";
import { bumpCollaborationMeta, detectRevisionConflict, parseCollaborationMeta } from "../collaboration/revisionConflict";
import { getFirebase } from "../lib/firebase";
import type { AppPersisted } from "./mortgageState";
import { LEGACY_CATEGORY_KEYS, resolveScenarioFromHouseDoc } from "./houseTree";

export { ensureAuthUser as ensureFirebaseUser };
export { detectRevisionConflict };
export type { RevisionConflict };
export { resolvePropertyAccess };

/**
 * Firestore collection of house root documents.
 *
 * One structure as source of truth:
 *   id (`001`) + meta + scenario (all tab inputs in one object)
 *
 * Reuse `scenario` fields — do not fork copies into many category maps.
 */
export const PROPERTIES_COLLECTION = "properties";
export const ACTIVE_PROPERTY_KEY = "mortgage-pro:active-property-id";

export type PropertyMeta = {
  /** Firestore document path id (internal). */
  id: string;
  /**
   * Business house id — the root identity users see (`001`, `002`, …).
   * Stored on the doc as both `id` (business) and `houseId` (alias for older clients).
   */
  houseId: string;
  houseNumber: number;
  name: string;
  archived: boolean;
  archivedAt: number | null;
  updatedAt: number;
  lastOpenedAt: number;
  accessRole: HouseAccessRole;
  ownerUid?: string;
};

/**
 * House root document (runtime view).
 * `scenario` is the single AppPersisted blob for every tab / reusable panel input.
 */
export type PropertyDoc = PropertyMeta & {
  userId: string;
  /** All tab inputs — point of truth (never drop fields when saving). */
  scenario: AppPersisted;
  /** Optional monotonic revision metadata for future multi-session edits. */
  collaboration?: ScenarioCollaborationMeta;
  memberUids?: string[];
};

export type ListPropertiesOptions = {
  /** When set, filter to active (`false`) or archived (`true`). Omit for all. */
  archived?: boolean;
};

function asMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    try {
      return (value as Timestamp).toMillis();
    } catch {
      /* ignore */
    }
  }
  return 0;
}

function asHouseNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return fallback;
}

/** Format house number as zero-padded id: 1 → "001". */
export function formatHouseId(n: number): string {
  const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return String(safe).padStart(3, "0");
}

/** Default display label when no custom name is set: House 001 */
export function houseLabel(houseIdOrNumber: string | number): string {
  if (typeof houseIdOrNumber === "number") {
    return `House ${formatHouseId(houseIdOrNumber)}`;
  }
  const trimmed = houseIdOrNumber.trim();
  if (/^\d+$/.test(trimmed)) {
    return `House ${formatHouseId(Number(trimmed))}`;
  }
  return trimmed.startsWith("House ") ? trimmed : `House ${trimmed}`;
}

/** Prefer a custom property name; fall back to House 001. */
export function resolvePropertyName(rawName: unknown, houseId: string): string {
  if (typeof rawName === "string") {
    const trimmed = rawName.trim();
    if (trimmed.length > 0) return trimmed.slice(0, 80);
  }
  return houseLabel(houseId);
}

/** Normalize user-entered name; empty → default House ### label. */
export function normalizePropertyName(raw: string, houseId: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  return trimmed.length > 0 ? trimmed : houseLabel(houseId);
}

function resolveHouseId(data: Record<string, unknown>, houseNumber: number): string {
  // Prefer business root `id` (`001`), then legacy `houseId`.
  for (const key of ["id", "houseId"] as const) {
    const raw = data[key];
    if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
      return formatHouseId(Number(raw.trim()));
    }
  }
  return formatHouseId(houseNumber);
}

function resolveArchived(data: Record<string, unknown>): boolean {
  return data.archived === true;
}

function resolveArchivedAt(data: Record<string, unknown>, archived: boolean): number | null {
  if (!archived) return null;
  const at = asMillis(data.archivedAt);
  return at > 0 ? at : Date.now();
}

export function readActivePropertyId(): string | null {
  try {
    const id = localStorage.getItem(ACTIVE_PROPERTY_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export function writeActivePropertyId(id: string | null): void {
  try {
    if (!id) localStorage.removeItem(ACTIVE_PROPERTY_KEY);
    else localStorage.setItem(ACTIVE_PROPERTY_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

type RawRow = {
  id: string;
  houseNumber: number;
  houseId: string;
  name: string;
  archived: boolean;
  archivedAt: number | null;
  updatedAt: number;
  lastOpenedAt: number;
  createdAt: number;
  needsMigrate: boolean;
  accessRole: HouseAccessRole;
  ownerUid: string;
  raw: Record<string, unknown>;
};

function mapDocToRawRow(
  d: { id: string; data: () => Record<string, unknown> },
  index: number,
  accessRole: HouseAccessRole,
  viewerUid: string
): RawRow {
  const data = d.data();
  const ownerUid = String(data.userId ?? "");
  const houseNumber = asHouseNumber(data.houseNumber, index + 1);
  const houseId = resolveHouseId(data, houseNumber);
  const archived = resolveArchived(data);
  const archivedAt = resolveArchivedAt(data, archived);
  const name = resolvePropertyName(data.name, houseId);
  const isOwnerRow = accessRole === "owner";
  return {
    id: d.id,
    houseNumber,
    houseId,
    name,
    archived,
    archivedAt,
    updatedAt: asMillis(data.updatedAt),
    lastOpenedAt: asMillis(data.lastOpenedAt),
    createdAt: asMillis(data.createdAt),
    needsMigrate:
      isOwnerRow &&
      (data.houseId !== houseId ||
        data.id !== houseId ||
        data.houseNumber !== houseNumber ||
        data.archived !== archived ||
        (archived ? data.archivedAt == null : data.archivedAt != null) ||
        (typeof data.name !== "string" || !data.name.trim())),
    accessRole,
    ownerUid: isOwnerRow ? viewerUid : ownerUid,
    raw: data,
  };
}

async function fetchAllPropertyRows(userId: string): Promise<RawRow[]> {
  const fb = getFirebase();
  if (!fb) return [];
  const ownedQ = query(collection(fb.db, PROPERTIES_COLLECTION), where("userId", "==", userId));
  const memberQ = query(collection(fb.db, PROPERTIES_COLLECTION), where("memberUids", "array-contains", userId));
  const [ownedSnap, memberSnap] = await Promise.all([getDocs(ownedQ), getDocs(memberQ)]);
  const byId = new Map<string, RawRow>();
  ownedSnap.docs.forEach((d, index) => byId.set(d.id, mapDocToRawRow(d, index, "owner", userId)));
  memberSnap.docs.forEach((d, index) => {
    if (!byId.has(d.id)) byId.set(d.id, mapDocToRawRow(d, index, "member", userId));
  });
  return [...byId.values()];
}

/** Persist missing houseId / archived fields without touching category / scenario data. */
async function migrateMissingFields(rows: RawRow[]): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;

  const pending = rows.filter((r) => r.needsMigrate && r.accessRole === "owner");
  await Promise.all(
    pending.map((row) =>
      updateDoc(doc(fb.db, PROPERTIES_COLLECTION, row.id), {
        // Business root id (`001`) — field `id` + alias `houseId`.
        id: row.houseId,
        houseId: row.houseId,
        houseNumber: row.houseNumber,
        name: row.name,
        archived: row.archived,
        archivedAt: row.archivedAt,
      }).catch((err) => {
        console.warn("[firestore] migrate house fields failed", row.id, err);
      })
    )
  );
}

function normalizeHouseNumbers(rows: RawRow[]): PropertyMeta[] {
  const owned = rows.filter((r) => r.accessRole === "owner");
  const shared = rows.filter((r) => r.accessRole === "member");
  const sortedOwned = [...owned].sort((a, b) => {
    if (a.houseNumber !== b.houseNumber) return a.houseNumber - b.houseNumber;
    return a.createdAt - b.createdAt;
  });
  const used = new Set<number>();
  let next = 1;
  const ownedMeta = sortedOwned.map((row) => {
    let n = row.houseNumber;
    if (!Number.isFinite(n) || n < 1 || used.has(n)) {
      while (used.has(next)) next += 1;
      n = next;
    }
    used.add(n);
    const houseId = formatHouseId(n);
    const prevDefault = houseLabel(row.houseId);
    const name =
      row.houseId === houseId
        ? resolvePropertyName(row.name, houseId)
        : row.name.trim() && row.name !== prevDefault
          ? row.name.trim().slice(0, 80)
          : houseLabel(houseId);
    return {
      id: row.id,
      houseNumber: n,
      houseId,
      name,
      archived: row.archived,
      archivedAt: row.archived ? row.archivedAt : null,
      updatedAt: row.updatedAt,
      lastOpenedAt: row.lastOpenedAt,
      accessRole: "owner" as const,
      ownerUid: row.ownerUid,
    };
  });
  const sharedMeta = shared
    .map((row) => ({
      id: row.id,
      houseNumber: row.houseNumber,
      houseId: row.houseId,
      name: row.name,
      archived: row.archived,
      archivedAt: row.archived ? row.archivedAt : null,
      updatedAt: row.updatedAt,
      lastOpenedAt: row.lastOpenedAt,
      accessRole: "member" as const,
      ownerUid: row.ownerUid,
    }))
    .sort((a, b) => a.houseId.localeCompare(b.houseId));
  return [...ownedMeta, ...sharedMeta];
}

export async function listProperties(
  userId: string,
  options?: ListPropertiesOptions
): Promise<PropertyMeta[]> {
  const rows = await fetchAllPropertyRows(userId);
  await migrateMissingFields(rows);
  let meta = normalizeHouseNumbers(rows);

  // If normalize changed numbers, persist those too (and houseId).
  const byId = new Map(rows.map((r) => [r.id, r]));
  const renumber = meta.filter((m) => {
    if (m.accessRole !== "owner") return false;
    const raw = byId.get(m.id);
    return (
      raw &&
      (raw.houseNumber !== m.houseNumber ||
        raw.houseId !== m.houseId ||
        raw.name !== m.name ||
        raw.archived !== m.archived)
    );
  });
  if (renumber.length > 0) {
    const fb = getFirebase();
    if (fb) {
      await Promise.all(
        renumber.map((m) =>
          updateDoc(doc(fb.db, PROPERTIES_COLLECTION, m.id), {
            id: m.houseId,
            houseId: m.houseId,
            houseNumber: m.houseNumber,
            name: m.name,
            archived: m.archived,
            archivedAt: m.archivedAt,
          }).catch((err) => console.warn("[firestore] renumber migrate failed", m.id, err))
        )
      );
    }
  }

  if (options?.archived !== undefined) {
    meta = meta.filter((p) => p.archived === options.archived);
  }
  return meta;
}

/** Next house number among all houses (active + archived). Archived IDs are not reused. */
export async function nextHouseNumber(userId: string): Promise<number> {
  const owned = (await listProperties(userId)).filter((p) => p.accessRole === "owner");
  if (owned.length === 0) return 1;
  return Math.max(...owned.map((p) => p.houseNumber)) + 1;
}

/** Full house docs for comparison (meta + unpacked category data). Defaults to active houses only. */
export async function listPropertyDocs(
  userId: string,
  options?: ListPropertiesOptions
): Promise<PropertyDoc[]> {
  const fb = getFirebase();
  if (!fb) return [];

  const filter: ListPropertiesOptions = { archived: options?.archived ?? false };
  const meta = await listProperties(userId, filter);
  const ids = new Set(meta.map((m) => m.id));
  const ownedQ = query(collection(fb.db, PROPERTIES_COLLECTION), where("userId", "==", userId));
  const memberQ = query(collection(fb.db, PROPERTIES_COLLECTION), where("memberUids", "array-contains", userId));
  const [ownedSnap, memberSnap] = await Promise.all([getDocs(ownedQ), getDocs(memberQ)]);
  const byId = new Map<string, Record<string, unknown>>();
  for (const d of [...ownedSnap.docs, ...memberSnap.docs]) {
    if (ids.has(d.id)) byId.set(d.id, d.data() as Record<string, unknown>);
  }

  const docs: PropertyDoc[] = [];
  for (const m of meta) {
    const data = byId.get(m.id);
    if (!data) continue;
    const scenario = resolveScenarioFromHouseDoc(data);
    if (!scenario) continue;
    const { memberUids } = readMembersFromDoc(data);
    docs.push({
      id: m.id,
      userId: String(data.userId ?? m.ownerUid ?? userId),
      houseId: m.houseId,
      houseNumber: m.houseNumber,
      name: m.name,
      archived: m.archived,
      archivedAt: m.archivedAt,
      scenario,
      updatedAt: asMillis(data.updatedAt),
      lastOpenedAt: asMillis(data.lastOpenedAt),
      accessRole: m.accessRole,
      ownerUid: m.ownerUid,
      collaboration: parseCollaborationMeta(data.collaboration) ?? undefined,
      memberUids,
    });
  }
  return docs;
}

export async function getProperty(id: string, viewerUid?: string): Promise<PropertyDoc | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const snap = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const ownerUid = String(data.userId ?? "");
  const accessRole =
    viewerUid != null ? resolvePropertyAccess(data, viewerUid) : ("owner" as HouseAccessRole);
  if (viewerUid != null && accessRole == null) return null;
  const houseNumber = asHouseNumber(data.houseNumber, 1);
  const houseId = resolveHouseId(data, houseNumber);
  const archived = resolveArchived(data);
  const archivedAt = resolveArchivedAt(data, archived);
  const name = resolvePropertyName(data.name, houseId);
  const nameMissing = typeof data.name !== "string" || !data.name.trim();

  const scenario = resolveScenarioFromHouseDoc(data);
  if (!scenario) return null;

  const role = accessRole ?? "owner";
  if (
    role === "owner" &&
    (data.houseId !== houseId ||
    data.id !== houseId ||
    nameMissing ||
    data.archived !== archived ||
    (archived ? data.archivedAt == null : data.archivedAt != null))
  ) {
    void updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
      id: houseId,
      houseId,
      houseNumber,
      archived,
      archivedAt,
      ...(nameMissing ? { name } : {}),
    }).catch((err) => console.warn("[firestore] getProperty migrate failed", id, err));
  }

  const { memberUids } = readMembersFromDoc(data);
  return {
    id: snap.id,
    userId: ownerUid,
    houseId,
    houseNumber,
    name,
    archived,
    archivedAt,
    scenario,
    updatedAt: asMillis(data.updatedAt),
    lastOpenedAt: asMillis(data.lastOpenedAt),
    accessRole: role,
    ownerUid: role === "member" ? ownerUid : viewerUid ?? ownerUid,
    collaboration: parseCollaborationMeta(data.collaboration) ?? undefined,
    memberUids,
  };
}

export async function createProperty(
  userId: string,
  scenario: AppPersisted,
  houseNumber?: number,
  name?: string
): Promise<string> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");

  const n = houseNumber ?? (await nextHouseNumber(userId));
  const houseId = formatHouseId(n);
  const now = Date.now();
  const ref = await addDoc(collection(fb.db, PROPERTIES_COLLECTION), {
    userId,
    /** Business root id (`001`) — same value as `houseId`. */
    id: houseId,
    houseId,
    houseNumber: n,
    name: normalizePropertyName(name ?? "", houseId),
    archived: false,
    archivedAt: null,
    /** Single structure for all inputs — do not split across category maps. */
    scenario,
    updatedAt: now,
    lastOpenedAt: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Persist the full scenario under this house root (`id` = `001`…).
 * One point of truth: the `scenario` object keeps every input field.
 * Clears any legacy category maps so we don’t maintain duplicate copies.
 */
export async function savePropertyScenario(
  id: string,
  userId: string,
  scenario: AppPersisted,
  options?: {
    name?: string;
    houseNumber?: number;
    houseId?: string;
    editorSessionId?: string;
    expectedRevision?: number;
    lastAppliedShareToken?: string;
    forceOverwrite?: boolean;
  }
): Promise<ScenarioCollaborationMeta> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");

  const existing = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!existing.exists()) throw new Error("House not found.");
  const existingData = existing.data() as Record<string, unknown>;
  const access = resolvePropertyAccess(existingData, userId);
  if (!access) throw new Error("You do not have access to edit this house.");

  const remote = parseCollaborationMeta(existingData.collaboration);
  if (
    !options?.forceOverwrite &&
    options?.expectedRevision != null &&
    remote &&
    remote.revision !== options.expectedRevision
  ) {
    throw new Error(
      `Revision conflict: remote ${remote.revision} ≠ expected ${options.expectedRevision}. Reload before saving.`
    );
  }
  const collaboration = bumpCollaborationMeta(remote, userId, options?.editorSessionId ?? "unknown", {
    lastAppliedShareToken: options?.lastAppliedShareToken,
  });

  const payload: Record<string, unknown> = {
    scenario,
    collaboration,
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
  for (const key of LEGACY_CATEGORY_KEYS) payload[key] = deleteField();

  if (access === "owner") {
    payload.userId = String(existingData.userId ?? userId);
    if (options?.houseNumber !== undefined) {
      const n = options.houseNumber;
      const houseId = options.houseId ?? formatHouseId(n);
      payload.houseNumber = n;
      payload.id = houseId;
      payload.houseId = houseId;
      if (options.name !== undefined) payload.name = normalizePropertyName(options.name, houseId);
    } else if (options?.houseId !== undefined) {
      const houseId = formatHouseId(Number(options.houseId));
      payload.id = houseId;
      payload.houseId = houseId;
      if (options.name !== undefined) payload.name = normalizePropertyName(options.name, houseId);
    } else if (options?.name !== undefined) {
      payload.name = options.name.trim().replace(/\s+/g, " ").slice(0, 80) || "House";
    }
  }

  await setDoc(doc(fb.db, PROPERTIES_COLLECTION, id), payload, { merge: true });
  return collaboration;
}

/** Rename a property. Empty input falls back to House ###. Owner only. */
export async function renameProperty(
  id: string,
  name: string,
  houseId: string,
  viewerUid: string
): Promise<string> {
  const fb = getFirebase();
  const next = normalizePropertyName(name, houseId);
  if (!fb) return next;
  const snap = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!snap.exists()) throw new Error("House not found.");
  if (resolvePropertyAccess(snap.data() as Record<string, unknown>, viewerUid) !== "owner") {
    throw new Error("Only the owner can rename this house.");
  }
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), { name: next, updatedAt: Date.now() });
  return next;
}

/** Soft-hide house. Owner only. */
export async function archiveProperty(id: string, viewerUid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const snap = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!snap.exists()) throw new Error("House not found.");
  if (resolvePropertyAccess(snap.data() as Record<string, unknown>, viewerUid) !== "owner") {
    throw new Error("Only the owner can archive this house.");
  }
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
    archived: true,
    archivedAt: Date.now(),
  });
}

/** Restore archived house. Owner only. */
export async function restoreProperty(id: string, viewerUid: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  const snap = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!snap.exists()) throw new Error("House not found.");
  if (resolvePropertyAccess(snap.data() as Record<string, unknown>, viewerUid) !== "owner") {
    throw new Error("Only the owner can restore this house.");
  }
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), { archived: false, archivedAt: null });
}

export async function touchLastOpened(id: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
    lastOpenedAt: Date.now(),
  });
}
