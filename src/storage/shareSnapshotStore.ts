import { isFirebaseConfigured } from "../lib/firebase";
import type { ShareSnapshotStore } from "../share/shareSnapshotTypes";
import { createFirestoreShareSnapshotStore } from "./firestoreShareSnapshotStore";
import { createLocalShareSnapshotStore } from "./localShareSnapshotStore";

let cached: ShareSnapshotStore | null = null;

export function getShareSnapshotStore(preferCloud = isFirebaseConfigured()): ShareSnapshotStore {
  if (cached) return cached;
  if (preferCloud) {
    const cloud = createFirestoreShareSnapshotStore();
    if (cloud) {
      cached = cloud;
      return cloud;
    }
  }
  cached = createLocalShareSnapshotStore();
  return cached;
}

export function resetShareSnapshotStoreForTests(): void {
  cached = null;
}

export type { ShareSnapshotStore } from "../share/shareSnapshotTypes";
