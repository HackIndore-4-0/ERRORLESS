/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HUMAI_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
