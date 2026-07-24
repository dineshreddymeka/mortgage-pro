/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps JavaScript API browser key (client-visible; restrict by HTTP referrer). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_BASE_PATH?: string;
  /** Firebase web config — public by design; protect data with Auth + Firestore rules. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Dedicated tax research proxy base URL; falls back to VITE_ESTIMATE_API_BASE_URL. */
  readonly VITE_TAX_RESEARCH_API_BASE_URL?: string;
  readonly VITE_ESTIMATE_API_BASE_URL?: string;
  readonly VITE_ESTIMATE_API_TIMEOUT_MS?: string;
  readonly VITE_TAX_RESEARCH_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
