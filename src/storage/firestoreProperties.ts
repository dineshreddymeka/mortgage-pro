import {
  addDoc,
  collection,
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
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirebase } from "../lib/firebase";
import type { AppPersisted } from "./mortgageState";

export const PROPERTIES_COLLECTION = "properties";
export const ACTIVE_PROPERTY_KEY = "mortgage-pro:active-property-id";

export type PropertyMeta = {
  id: string;
  /** Zero-padded business id, e.g. "001". */
  houseId: string;
  houseNumber: number;
  name: string;
  archived: boolean;
  archivedAt: number | null;
  updatedAt: number;
  lastOpenedAt: number;
};

export type PropertyDoc = PropertyMeta & {
  userId: string;
  /** Full AppPersisted for all tabs (Mortgage, Upfront, Rental, When to sell). */
  scenario: AppPersisted;
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

/** Display label: House 001 */
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

function resolveHouseId(data: Record<string, unknown>, houseNumber: number): string {
  const raw = data.houseId;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    return formatHouseId(Number(raw.trim()));
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

/** Resolve a signed-in user (anonymous). Returns null if Firebase/Auth is unavailable. */
export async function ensureFirebaseUser(): Promise<User | null> {
  const fb = getFirebase();
  if (!fb) return null;

  if (fb.auth.currentUser) return fb.auth.currentUser;

  await new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(fb.auth, () => {
      unsub();
      resolve();
    });
  });

  if (fb.auth.currentUser) return fb.auth.currentUser;

  try {
    const cred = await signInAnonymously(fb.auth);
    return cred.user;
  } catch (err) {
    console.warn(
      "[firestore] Anonymous sign-in failed. Enable Authentication → Anonymous in Firebase Console.",
      err
    );
    return null;
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
  raw: Record<string, unknown>;
};

async function fetchAllPropertyRows(userId: string): Promise<RawRow[]> {
  const fb = getFirebase();
  if (!fb) return [];

  // Filter only (no orderBy) so a composite index is not required; sort in the client.
  const q = query(collection(fb.db, PROPERTIES_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);

  return snap.docs.map((d, index) => {
    const data = d.data() as Record<string, unknown>;
    const houseNumber = asHouseNumber(data.houseNumber, index + 1);
    const houseId = resolveHouseId(data, houseNumber);
    const archived = resolveArchived(data);
    const archivedAt = resolveArchivedAt(data, archived);
    const expectedName = houseLabel(houseId);
    const needsMigrate =
      data.houseId !== houseId ||
      data.houseNumber !== houseNumber ||
      data.archived !== archived ||
      (archived ? data.archivedAt == null : data.archivedAt != null) ||
      data.name !== expectedName;

    return {
      id: d.id,
      houseNumber,
      houseId,
      name: expectedName,
      archived,
      archivedAt,
      updatedAt: asMillis(data.updatedAt),
      lastOpenedAt: asMillis(data.lastOpenedAt),
      createdAt: asMillis(data.createdAt),
      needsMigrate,
      raw: data,
    };
  });
}

/** Persist missing houseId / archived fields without touching scenario. */
async function migrateMissingFields(rows: RawRow[]): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;

  const pending = rows.filter((r) => r.needsMigrate);
  await Promise.all(
    pending.map((row) =>
      updateDoc(doc(fb.db, PROPERTIES_COLLECTION, row.id), {
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
  const sorted = [...rows].sort((a, b) => {
    if (a.houseNumber !== b.houseNumber) return a.houseNumber - b.houseNumber;
    return a.createdAt - b.createdAt;
  });

  // Keep assigned numbers stable when valid; fill gaps only for missing/duplicates.
  const used = new Set<number>();
  let next = 1;
  return sorted.map((row) => {
    let n = row.houseNumber;
    if (!Number.isFinite(n) || n < 1 || used.has(n)) {
      while (used.has(next)) next += 1;
      n = next;
    }
    used.add(n);
    const houseId = formatHouseId(n);
    return {
      id: row.id,
      houseNumber: n,
      houseId,
      name: houseLabel(houseId),
      archived: row.archived,
      archivedAt: row.archived ? row.archivedAt : null,
      updatedAt: row.updatedAt,
      lastOpenedAt: row.lastOpenedAt,
    };
  });
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
  const list = await listProperties(userId);
  if (list.length === 0) return 1;
  return Math.max(...list.map((p) => p.houseNumber)) + 1;
}

/** Full property docs for comparison (meta + scenario). Defaults to active houses only. */
export async function listPropertyDocs(
  userId: string,
  options?: ListPropertiesOptions
): Promise<PropertyDoc[]> {
  const fb = getFirebase();
  if (!fb) return [];

  const filter: ListPropertiesOptions = { archived: options?.archived ?? false };
  const meta = await listProperties(userId, filter);
  const q = query(collection(fb.db, PROPERTIES_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  const byId = new Map(snap.docs.map((d) => [d.id, d.data()]));

  return meta
    .map((m) => {
      const data = byId.get(m.id);
      if (!data?.scenario) return null;
      return {
        id: m.id,
        userId,
        houseId: m.houseId,
        houseNumber: m.houseNumber,
        name: m.name,
        archived: m.archived,
        archivedAt: m.archivedAt,
        scenario: data.scenario as AppPersisted,
        updatedAt: asMillis(data.updatedAt),
        lastOpenedAt: asMillis(data.lastOpenedAt),
      } satisfies PropertyDoc;
    })
    .filter((x): x is PropertyDoc => x != null);
}

export async function getProperty(id: string): Promise<PropertyDoc | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const snap = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const houseNumber = asHouseNumber(data.houseNumber, 1);
  const houseId = resolveHouseId(data, houseNumber);
  const archived = resolveArchived(data);
  const archivedAt = resolveArchivedAt(data, archived);
  const name = houseLabel(houseId);

  // Migrate missing fields on read (never touch scenario).
  if (
    data.houseId !== houseId ||
    data.name !== name ||
    data.archived !== archived ||
    (archived ? data.archivedAt == null : data.archivedAt != null)
  ) {
    void updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
      houseId,
      houseNumber,
      name,
      archived,
      archivedAt,
    }).catch((err) => console.warn("[firestore] getProperty migrate failed", id, err));
  }

  return {
    id: snap.id,
    userId: String(data.userId ?? ""),
    houseId,
    houseNumber,
    name,
    archived,
    archivedAt,
    scenario: data.scenario as AppPersisted,
    updatedAt: asMillis(data.updatedAt),
    lastOpenedAt: asMillis(data.lastOpenedAt),
  };
}

export async function createProperty(
  userId: string,
  scenario: AppPersisted,
  houseNumber?: number
): Promise<string> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");

  const n = houseNumber ?? (await nextHouseNumber(userId));
  const houseId = formatHouseId(n);
  const now = Date.now();
  const ref = await addDoc(collection(fb.db, PROPERTIES_COLLECTION), {
    userId,
    houseId,
    houseNumber: n,
    name: houseLabel(houseId),
    archived: false,
    archivedAt: null,
    scenario,
    updatedAt: now,
    lastOpenedAt: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Persist full scenario (all tabs) under this house.
 * Does not clear or alter scenario when archiving — archive is a separate soft-hide flag.
 */
export async function savePropertyScenario(
  id: string,
  userId: string,
  scenario: AppPersisted,
  options?: { name?: string; houseNumber?: number; houseId?: string }
): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;

  const payload: Record<string, unknown> = {
    userId,
    scenario,
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
  if (options?.houseNumber !== undefined) {
    const n = options.houseNumber;
    const houseId = options.houseId ?? formatHouseId(n);
    payload.houseNumber = n;
    payload.houseId = houseId;
    payload.name = houseLabel(houseId);
  } else if (options?.houseId !== undefined) {
    payload.houseId = formatHouseId(Number(options.houseId));
    payload.name = houseLabel(payload.houseId as string);
  } else if (options?.name !== undefined) {
    payload.name = options.name.trim() || "House";
  }

  await setDoc(doc(fb.db, PROPERTIES_COLLECTION, id), payload, { merge: true });
}

/** Soft-hide house. Scenario is left intact. */
export async function archiveProperty(id: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
    archived: true,
    archivedAt: Date.now(),
  });
}

/** Restore archived house. Same houseId and full scenario retained. */
export async function restoreProperty(id: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
    archived: false,
    archivedAt: null,
  });
}

export async function touchLastOpened(id: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
    lastOpenedAt: Date.now(),
  });
}
