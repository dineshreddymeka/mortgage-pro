import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedDb: Firestore | null = null;

/** Lazy Firestore Admin accessor — initialized on first use after `initializeApp()`. */
export function getDb(): Firestore {
  cachedDb ??= getFirestore();
  return cachedDb;
}

export function resetDbForTests(): void {
  cachedDb = null;
}
