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

export function defaultPropertyName(scenario: AppPersisted): string {
  const address = (scenario.propertyAddress ?? "").trim();
  if (address) return address.length > 48 ? `${address.slice(0, 45)}…` : address;
  const price = Number(scenario.homePrice);
  if (Number.isFinite(price) && price > 0) {
    return `Property · $${Math.round(price).toLocaleString("en-US")}`;
  }
  return "Untitled property";
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
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name ?? "Untitled property"),
        updatedAt: asMillis(data.updatedAt),
        lastOpenedAt: asMillis(data.lastOpenedAt),
      };
    })
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function getProperty(id: string): Promise<PropertyDoc | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const snap = await getDoc(doc(fb.db, PROPERTIES_COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    userId: String(data.userId ?? ""),
    name: String(data.name ?? "Untitled property"),
    scenario: data.scenario as AppPersisted,
    updatedAt: asMillis(data.updatedAt),
    lastOpenedAt: asMillis(data.lastOpenedAt),
  };
}

export async function createProperty(
  userId: string,
  scenario: AppPersisted,
  name?: string
): Promise<string> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured");

  const now = Date.now();
  const ref = await addDoc(collection(fb.db, PROPERTIES_COLLECTION), {
    userId,
    name: (name ?? defaultPropertyName(scenario)).trim() || "Untitled property",
    scenario,
    updatedAt: now,
    lastOpenedAt: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function savePropertyScenario(
  id: string,
  userId: string,
  scenario: AppPersisted,
  name?: string
): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;

  const payload: Record<string, unknown> = {
    userId,
    scenario,
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
  if (name !== undefined) {
    payload.name = name.trim() || "Untitled property";
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
