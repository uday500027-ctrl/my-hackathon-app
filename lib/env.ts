import "server-only";
import { z } from "zod";

// ─── Supabase env ─────────────────────────────────────────────────────────────

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

let _supabaseEnv: SupabaseEnv | undefined;

export function getSupabaseEnv(): SupabaseEnv {
  if (_supabaseEnv) return _supabaseEnv;

  const result = supabaseEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing or invalid environment variable(s): ${missing}. ` +
        `Please add them to .env.local (server-side only, never NEXT_PUBLIC_).`
    );
  }

  _supabaseEnv = result.data;
  return _supabaseEnv;
}

// ─── JWT env ──────────────────────────────────────────────────────────────────

const jwtEnvSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),
});

type JwtEnv = z.infer<typeof jwtEnvSchema>;

let _jwtEnv: JwtEnv | undefined;

export function getJwtEnv(): JwtEnv {
  if (_jwtEnv) return _jwtEnv;

  const result = jwtEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing or invalid environment variable(s): ${missing}. ` +
        `Please add them to .env.local (server-side only, never NEXT_PUBLIC_).`
    );
  }

  _jwtEnv = result.data;
  return _jwtEnv;
}

// ─── Gemini env (optional — missing key falls back gracefully) ───────────────

export function getGeminiEnv(): { GEMINI_API_KEY?: string; GEMINI_MODEL: string } {
  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  };
}

// ─── Combined (kept for any code that needs all three) ────────────────────────

export function getEnv() {
  return { ...getSupabaseEnv(), ...getJwtEnv(), ...getGeminiEnv() };
}

/** Lazy proxy over the combined env — access any key, validated on first read. */
export const env = new Proxy({} as ReturnType<typeof getEnv>, {
  get(_target, prop) {
    return getEnv()[prop as keyof ReturnType<typeof getEnv>];
  },
});
