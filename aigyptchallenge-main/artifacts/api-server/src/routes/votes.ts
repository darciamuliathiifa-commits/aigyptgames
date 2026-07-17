import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

const MAX_VOTES_PER_DEVICE = 3;

// POST /votes — cast a vote
router.post("/votes", async (req, res) => {
  const { submission_id, voter_fingerprint } = req.body as {
    submission_id?: string;
    voter_fingerprint?: string;
  };

  if (!submission_id || !voter_fingerprint) {
    res.status(400).json({ error: "submission_id and voter_fingerprint are required" });
    return;
  }

  // Check voting is open
  const { data: votingSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "voting_open")
    .single();

  if (!votingSetting || votingSetting.value !== "true") {
    res.status(400).json({ error: "Voting sedang ditutup", success: false });
    return;
  }

  // Check submission is verified
  const { data: submission, error: sErr } = await supabaseAdmin
    .from("submissions")
    .select("id, status")
    .eq("id", submission_id)
    .single();

  if (sErr || !submission || submission.status !== "verified") {
    res.status(400).json({ error: "Karya tidak ditemukan atau belum terverifikasi", success: false });
    return;
  }

  // Count existing votes by this fingerprint
  const { data: existingVotes, error: vErr } = await supabaseAdmin
    .from("votes")
    .select("id")
    .eq("voter_fingerprint", voter_fingerprint);

  if (vErr) {
    logger.error({ vErr }, "Failed to count votes");
    res.status(500).json({ error: "Failed to check votes", success: false });
    return;
  }

  if ((existingVotes?.length ?? 0) >= MAX_VOTES_PER_DEVICE) {
    res.status(400).json({ error: "Maksimal 3 vote per device", success: false });
    return;
  }

  // Insert vote
  const { error: insertErr } = await supabaseAdmin
    .from("votes")
    .insert({ submission_id, voter_fingerprint });

  if (insertErr) {
    if (insertErr.code === "23505") {
      res.status(400).json({ error: "Sudah vote karya ini", success: false });
      return;
    }
    logger.error({ insertErr }, "Failed to insert vote");
    res.status(500).json({ error: "Failed to cast vote", success: false });
    return;
  }

  // Get updated vote count
  const { data: countData } = await supabaseAdmin
    .from("submission_vote_counts")
    .select("vote_count")
    .eq("submission_id", submission_id)
    .maybeSingle();

  res.status(201).json({
    success: true,
    message: "Vote berhasil!",
    vote_count: Number(countData?.vote_count ?? 1),
  });
});

// DELETE /votes/:submissionId — remove vote
router.delete("/votes/:submissionId", async (req, res) => {
  const { submissionId } = req.params;
  const { voter_fingerprint } = req.body as { voter_fingerprint?: string };

  if (!voter_fingerprint) {
    res.status(400).json({ error: "voter_fingerprint required", success: false });
    return;
  }

  const { error } = await supabaseAdmin
    .from("votes")
    .delete()
    .eq("submission_id", submissionId)
    .eq("voter_fingerprint", voter_fingerprint);

  if (error) {
    logger.error({ error }, "Failed to delete vote");
    res.status(500).json({ error: "Failed to remove vote", success: false });
    return;
  }

  const { data: countData } = await supabaseAdmin
    .from("submission_vote_counts")
    .select("vote_count")
    .eq("submission_id", submissionId)
    .maybeSingle();

  res.json({
    success: true,
    message: "Vote dihapus",
    vote_count: Number(countData?.vote_count ?? 0),
  });
});

export default router;
