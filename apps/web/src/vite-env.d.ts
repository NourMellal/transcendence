/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_GAME_URL: string;
  readonly VITE_WS_GAME_PATH: string;
  readonly VITE_GAME_MODE: string;
  readonly VITE_PRESENCE_HEARTBEAT_MS: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

