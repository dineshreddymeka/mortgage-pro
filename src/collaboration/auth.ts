import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebase } from "../lib/firebase";

export type AuthProviderKind = "anonymous" | "google";

export type AuthProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  provider: AuthProviderKind;
};

export type GoogleLinkResult =
  | { ok: true; user: User; linked: boolean }
  | {
      ok: false;
      code: "credential-already-in-use" | "popup-closed" | "unavailable" | "failed";
      message: string;
    };

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function describeAuthUser(user: User): AuthProfile {
  const google = user.providerData.find((p) => p.providerId === "google.com");
  return {
    uid: user.uid,
    email: user.email ?? google?.email ?? null,
    displayName: user.displayName ?? google?.displayName ?? null,
    isAnonymous: user.isAnonymous,
    provider: user.isAnonymous ? "anonymous" : google ? "google" : "anonymous",
  };
}

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
    return (await signInAnonymously(fb.auth)).user;
  } catch (err) {
    console.warn("[auth] Anonymous sign-in failed.", err);
    return null;
  }
}

export async function signInOrLinkGoogle(): Promise<GoogleLinkResult> {
  const fb = getFirebase();
  if (!fb) return { ok: false, code: "unavailable", message: "Firebase is not configured." };
  const user = fb.auth.currentUser ?? (await ensureFirebaseUser());
  if (!user) return { ok: false, code: "unavailable", message: "Could not start anonymous session." };
  if (!user.isAnonymous && user.providerData.some((p) => p.providerId === "google.com")) {
    return { ok: true, user, linked: false };
  }
  try {
    if (user.isAnonymous) {
      const linked = await linkWithPopup(user, googleProvider);
      return { ok: true, user: linked.user, linked: true };
    }
    const signed = await signInWithPopup(fb.auth, googleProvider);
    return { ok: true, user: signed.user, linked: false };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (code === "auth/credential-already-in-use") {
      return {
        ok: false,
        code: "credential-already-in-use",
        message:
          "That Google account already has a Property Pro profile. Switch to sign in with Google, or stay anonymous on this device.",
      };
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return { ok: false, code: "popup-closed", message: "Google sign-in was cancelled." };
    }
    return { ok: false, code: "failed", message: err instanceof Error ? err.message : "Google sign-in failed." };
  }
}

export async function signInWithGoogleDirect(): Promise<User | null> {
  const fb = getFirebase();
  if (!fb) return null;
  try {
    return (await signInWithPopup(fb.auth, googleProvider)).user;
  } catch (err) {
    console.warn("[auth] Google sign-in failed", err);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  await signOut(fb.auth);
}

export function subscribeAuthUser(onUser: (user: User | null) => void): () => void {
  const fb = getFirebase();
  if (!fb) {
    onUser(null);
    return () => {};
  }
  return onAuthStateChanged(fb.auth, onUser);
}
