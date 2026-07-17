import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// GET /settings — public settings
router.get("/settings", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value");

  if (error) {
    logger.error({ error }, "Failed to fetch settings");
    res.status(500).json({ error: "Failed to fetch settings" });
    return;
  }

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  res.json({
    deadline_submit: settings.deadline_submit ?? "",
    voting_open: settings.voting_open ?? "false",
  });
});

export default router;
