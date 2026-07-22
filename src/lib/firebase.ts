import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readConfig(): FirebaseWebConfig | null {
  const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY ?? "").trim();
  const authDomain = String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "").trim();
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "").trim();
  const storageBucket = String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "").trim();
  const messagingSenderId = String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "").trim();
  const appId = String(import.meta.env.VITE_FIREBASE_APP_ID ?? "").trim();

  if (!apiKey || !authDomain || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: storageBucket || `${projectId}.appspot.com`,
    messagingSenderId: messagingSenderId || "0",
    appId,
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/** Client SDK only — never use the Admin / service-account private key here. */
export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  const config = readConfig();
  if (!config) return null;

  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  }

  return { app, auth: auth!, db: db! };
}

export function isFirebaseConfigured(): boolean {
  return readConfig() !== null;
}
