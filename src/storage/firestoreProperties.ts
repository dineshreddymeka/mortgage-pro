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
  name: string;
  houseNumber: number;
  updatedAt: number;
  lastOpenedAt: number;
};

export type PropertyDoc = PropertyMeta & {
  userId: string;
  scenario: AppPersisted;
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

export function houseLabel(houseNumber: number): string {
  return `House ${houseNumber}`;
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

export async function listProperties(userId: string): Promise<PropertyMeta[]> {
  const fb = getFirebase();
  if (!fb) return [];

  // Filter only (no orderBy) so a composite index is not required; sort in the client.
  const q = query(collection(fb.db, PROPERTIES_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);

  const rows = snap.docs
    .map((d, index) => {
      const data = d.data();
      const houseNumber = asHouseNumber(data.houseNumber, index + 1);
      return {
        id: d.id,
        houseNumber,
        name: String(data.name ?? houseLabel(houseNumber)),
        updatedAt: asMillis(data.updatedAt),
        lastOpenedAt: asMillis(data.lastOpenedAt),
        _created: asMillis(data.createdAt),
      };
    })
    .sort((a, b) => {
      if (a.houseNumber !== b.houseNumber) return a.houseNumber - b.houseNumber;
      return a._created - b._created;
    });

  // Normalize missing / duplicate numbers to 1..n for stable nav labels.
  const used = new Set<number>();
  let next = 1;
  return rows.map((row) => {
    let n = row.houseNumber;
    if (!Number.isFinite(n) || n < 1 || used.has(n)) {
      while (used.has(next)) next += 1;
      n = next;
    }
    used.add(n);
    return {
      id: row.id,
      houseNumber: n,
      name: houseLabel(n),
      updatedAt: row.updatedAt,
      lastOpenedAt: row.lastOpenedAt,
    };
  });
}

export async function nextHouseNumber(userId: string): Promise<number> {
  const list = await listProperties(userId);
  if (list.length === 0) return 1;
  return Math.max(...list.map((p) => p.houseNumber)) + 1;
}

/** Full property docs for comparison (meta + scenario). */
export async function listPropertyDocs(userId: string): Promise<PropertyDoc[]> {
  const fb = getFirebase();
  if (!fb) return [];

  const meta = await listProperties(userId);
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
        houseNumber: m.houseNumber,
        name: m.name,
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
  const data = snap.data();
  const houseNumber = asHouseNumber(data.houseNumber, 1);
  return {
    id: snap.id,
    userId: String(data.userId ?? ""),
    houseNumber,
    name: String(data.name ?? houseLabel(houseNumber)),
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
  const now = Date.now();
  const ref = await addDoc(collection(fb.db, PROPERTIES_COLLECTION), {
    userId,
    houseNumber: n,
    name: houseLabel(n),
    scenario,
    updatedAt: now,
    lastOpenedAt: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Persist full scenario (all tabs). Does not rename the house unless `name` / `houseNumber` passed. */
export async function savePropertyScenario(
  id: string,
  userId: string,
  scenario: AppPersisted,
  options?: { name?: string; houseNumber?: number }
): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;

  const payload: Record<string, unknown> = {
    userId,
    scenario,
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
  if (options?.name !== undefined) {
    payload.name = options.name.trim() || "House";
  }
  if (options?.houseNumber !== undefined) {
    payload.houseNumber = options.houseNumber;
    payload.name = houseLabel(options.houseNumber);
  }

  await setDoc(doc(fb.db, PROPERTIES_COLLECTION, id), payload, { merge: true });
}

export async function touchLastOpened(id: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await updateDoc(doc(fb.db, PROPERTIES_COLLECTION, id), {
    lastOpenedAt: Date.now(),
  });
}
