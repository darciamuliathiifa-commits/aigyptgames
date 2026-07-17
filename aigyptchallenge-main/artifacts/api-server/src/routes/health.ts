import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { resolveSupabaseEnv } from "../lib/supabase";

const router: IRouter = Router();

function healthPayload() {
  const data = HealthCheckResponse.parse({ status: "ok" });
  const env = resolveSupabaseEnv();
  // Booleans only — never expose values. Makes "which env var is missing on
  // Vercel?" a 5-second check: open /api/healthz in the browser.
  return {
    ...data,
    supabase_env: {
      url: Boolean(env.url),
      service_role_key: Boolean(env.serviceKey),
      anon_key: Boolean(env.anonKey),
    },
  };
}

router.get("/healthz", (_req, res) => {
  res.json(healthPayload());
});

// Alias — easier to remember when debugging
router.get("/health", (_req, res) => {
  res.json(healthPayload());
});

export default router;
