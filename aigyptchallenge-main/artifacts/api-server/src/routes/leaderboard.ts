import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// GET /leaderboard — verified submissions sorted by votes
router.get("/leaderboard", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("leaderboard_public")
    .select("*")
    .eq("status", "verified")
    .order("vote_count", { ascending: false });

  if (error) {
    logger.error({ error }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
    return;
  }

  res.json(data ?? []);
});

// GET /recent-joins — most recent submissions (any status) for FOMO feed
router.get("/recent-joins", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("leaderboard_public")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logger.error({ error }, "Failed to fetch recent joins");
    res.status(500).json({ error: "Failed to fetch recent joins" });
    return;
  }

  res.json(data ?? []);
});

// GET /gallery — verified submissions for gallery
router.get("/gallery", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("leaderboard_public")
    .select("*")
    .eq("status", "verified")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ error }, "Failed to fetch gallery");
    res.status(500).json({ error: "Failed to fetch gallery" });
    return;
  }

  res.json(data ?? []);
});

export default router;
