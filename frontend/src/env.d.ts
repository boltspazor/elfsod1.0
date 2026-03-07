/// <reference types="vite/client" />

interface ImportMetaEnv {
  // ── Supabase (main project) ──────────────────────────────────────────────
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // ── Backend API services ─────────────────────────────────────────────────
  /** Main FastAPI backend – adsurv, targeting-intel, etc. (default: :8000) */
  readonly VITE_API_BASE_URL?: string;
  /** Auth service – login / signup (default: :5003) */
  readonly VITE_AUTH_API_URL?: string;
  /** Command Center – GenAI + image gen (single base URL for both) */
  readonly VITE_COMMAND_CENTER_API_URL?: string;
  /** GenAI / Command-Center / ChatInput (default: 127.0.0.1:5002) */
  readonly VITE_GENAI_API_URL?: string;
  /** Image-generation service – GenerateAdPopup (default: :5002) */
  readonly VITE_IMAGE_GEN_API_URL?: string;
  /** Image-generation REST API – imageGeneration.ts (default: :5006/api) */
  readonly VITE_IMAGE_GEN_REST_URL?: string;
  /** AutoCreate / campaign service (default: :5050) */
  readonly VITE_AUTOCREATE_API_URL?: string;

  // ── App meta ─────────────────────────────────────────────────────────────
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}