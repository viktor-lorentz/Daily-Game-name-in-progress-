/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the scores backend. Empty ⇒ offline-estimate mode. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
