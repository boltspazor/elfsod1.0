// src/config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralised environment-variable access for the Vite frontend.
// All import.meta.env reads happen here – the rest of the app imports from this
// file so config is validated in one place and easy to audit.
// ─────────────────────────────────────────────────────────────────────────────

// ── helpers ──────────────────────────────────────────────────────────────────

/** Returns the value or throws a clear error when a required variable is absent. */
function required(key: keyof ImportMetaEnv, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `[config] Missing required environment variable: ${key}\n` +
      `Add it to your .env file and restart the dev server.`
    );
  }
  return value.trim();
}

/** Returns the value or a fallback when the variable is optional. */
function optional(value: string | undefined, fallback: string): string {
  return value && value.trim() !== '' ? value.trim() : fallback;
}

// ── Supabase ─────────────────────────────────────────────────────────────────
export const SUPABASE_URL = required(
  'VITE_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_URL
);

export const SUPABASE_ANON_KEY = required(
  'VITE_SUPABASE_ANON_KEY',
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Backend API ───────────────────────────────────────────────────────────────
/** Main FastAPI backend (adsurv, targeting-intel, auth, etc.) */
export const API_BASE_URL = optional(
  import.meta.env.VITE_API_BASE_URL,
  'http://localhost:8000'
);

/** Auth service (login / signup) */
export const AUTH_API_URL = optional(
  import.meta.env.VITE_AUTH_API_URL,
  'http://localhost:5003'
);

/** GenAI / Command-Center / ChatInput service */
export const GENAI_API_URL = optional(
  import.meta.env.VITE_GENAI_API_URL,
  'http://127.0.0.1:5002'
);

/** Image-generation service */
export const IMAGE_GEN_API_URL = optional(
  import.meta.env.VITE_IMAGE_GEN_API_URL,
  'http://localhost:5002'
);

/** Dedicated image-generation REST API (imageGeneration.ts) */
export const IMAGE_GEN_REST_URL = optional(
  import.meta.env.VITE_IMAGE_GEN_REST_URL,
  'http://localhost:5006/api'
);

/** AutoCreate / campaign service */
export const AUTOCREATE_API_URL = optional(
  import.meta.env.VITE_AUTOCREATE_API_URL,
  'http://localhost:5050'
);

// ── App meta ─────────────────────────────────────────────────────────────────
export const APP_TITLE = optional(import.meta.env.VITE_APP_TITLE, 'ADOS');

// ── Validation (runs once at startup) ────────────────────────────────────────
// Supabase is required – throw immediately so the developer sees a clear message.
// All other variables have safe localhost fallbacks for development.
export function validateConfig(): void {
  // Re-call `required` for any vars that must exist in production
  required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
  required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);
}
