import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// ---------------------------------------------------------------------------
// Env resolution — accept multiple common names so a mismatch between what
// was configured on Vercel and what the code expects never crashes the
// function at cold start (which surfaces as FUNCTION_INVOCATION_FAILED with
// zero useful info). Missing envs now produce a clear JSON error instead.
// ---------------------------------------------------------------------------

function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim() !== "") return v.trim();
  }
  return undefined;
}

export function resolveSupabaseEnv() {
  const url = firstEnv(
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "VITE_SUPABASE_URL",
  );
  const serviceKey = firstEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SECRET_KEY",
  );
  const anonKey = firstEnv(
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );
  return { url, serviceKey, anonKey };
}

export function missingSupabaseEnvNames(): string[] {
  const { url, serviceKey, anonKey } = resolveSupabaseEnv();
  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL (atau NEXT_PUBLIC_SUPABASE_URL / VITE_SUPABASE_URL)");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!anonKey) missing.push("SUPABASE_ANON_KEY (atau NEXT_PUBLIC_SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY)");
  return missing;
}

const realtimeOpts = { transport: ws } as any;

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

function requireEnv() {
  const env = resolveSupabaseEnv();
  const missing = missingSupabaseEnvNames();
  if (missing.length > 0) {
    const err = new Error(
      `Missing Supabase env vars: ${missing.join(", ")}. ` +
        `Set them in Vercel → Project Settings → Environment Variables, lalu REDEPLOY.`,
    );
    (err as any).statusCode = 500;
    (err as any).expose = true;
    throw err;
  }
  return env as { url: string; serviceKey: string; anonKey: string };
}

function getAdmin(): SupabaseClient {
  if (!_admin) {
    const { url, serviceKey } = requireEnv();
    _admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: realtimeOpts,
    });
  }
  return _admin;
}

function getAnon(): SupabaseClient {
  if (!_anon) {
    const { url, anonKey } = requireEnv();
    _anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: realtimeOpts,
    });
  }
  return _anon;
}

// Lazy proxies — existing route code (`supabaseAdmin.from(...)`) keeps working
// unchanged; the real client is only created on first property access, and a
// missing env throws a descriptive error that the Express error handler turns
// into readable JSON instead of crashing the whole serverless function.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop, _r) {
    const client = getAdmin() as any;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const supabaseAnon: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop, _r) {
    const client = getAnon() as any;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
