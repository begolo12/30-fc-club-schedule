/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
