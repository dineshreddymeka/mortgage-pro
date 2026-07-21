/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps JavaScript API browser key (client-visible; restrict by HTTP referrer). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
