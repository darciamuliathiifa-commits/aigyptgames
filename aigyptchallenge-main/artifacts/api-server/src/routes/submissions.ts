import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// POST /submissions — create or replace submission for a specific entry
router.post("/submissions", async (req, res) => {
  const { participant_id, entry_id, image_url, ig_post_url } = req.body as {
    participant_id?: string;
    entry_id?: string;
    image_url?: string;
    ig_post_url?: string;
  };

  if (!participant_id || !entry_id || !image_url || !ig_post_url) {
    res
      .status(400)
      .json({ error: "participant_id, entry_id, image_url, ig_post_url are required" });
    return;
  }

  if (!ig_post_url.includes("instagram.com")) {
    res.status(400).json({ error: "ig_post_url must be an Instagram URL" });
    return;
  }

  // Check deadline
  const { data: deadlineSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "deadline_submit")
    .single();

  if (deadlineSetting) {
    const deadline = new Date(deadlineSetting.value);
    if (!isNaN(deadline.getTime()) && new Date() > deadline) {
      res.status(400).json({ error: "Deadline sudah lewat. Pendaftaran ditutup." });
      return;
    }
  }

  // Verify entry belongs to participant
  const { data: entry, error: entryErr } = await supabaseAdmin
    .from("entries")
    .select("id, entry_number, participant_id")
    .eq("id", entry_id)
    .eq("participant_id", participant_id)
    .single();

  if (entryErr || !entry) {
    res.status(400).json({ error: "Entry tidak valid atau bukan milik peserta ini" });
    return;
  }

  // Check for existing submission for this entry (replace only this entry's submission)
  const { data: existing } = await supabaseAdmin
    .from("submissions")
    .select("id")
    .eq("entry_id", entry_id)
    .maybeSingle();

  if (existing) {
    // Delete existing votes and submission, then reinsert
    await supabaseAdmin.from("votes").delete().eq("submission_id", existing.id);
    await supabaseAdmin.from("submissions").delete().eq("id", existing.id);
  }

  const { data: submission, error: insertErr } = await supabaseAdmin
    .from("submissions")
    .insert({
      participant_id,
      entry_id,
      image_url,
      ig_post_url,
      status: "pending",
    })
    .select("id, entry_id, participant_id, image_url, ig_post_url, status, winner_category, created_at")
    .single();

  if (insertErr) {
    logger.error({ insertErr }, "Failed to insert submission");
    res.status(500).json({ error: "Failed to create submission" });
    return;
  }

  res.status(201).json(submission);
});

// GET /submissions/by-participant/:participantId
router.get("/submissions/by-participant/:participantId", async (req, res) => {
  const { participantId } = req.params;

  const { data: submission, error } = await supabaseAdmin
    .from("submissions")
    .select("id, entry_id, participant_id, image_url, ig_post_url, status, winner_category, created_at")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ error }, "Failed to fetch submission");
    res.status(500).json({ error: "Failed to fetch submission" });
    return;
  }

  if (!submission) {
    res.status(404).json({ error: "No submission found" });
    return;
  }

  res.json(submission);
});

export default router;
