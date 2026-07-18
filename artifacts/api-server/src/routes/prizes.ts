import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// POST /prize/claim — claim a prize code (server-side only)
// Syarat: minimal SATU entry peserta berstatus verified
router.post("/prize/claim", async (req, res) => {
  const { participant_id } = req.body as { participant_id?: string };

  if (!participant_id) {
    res.status(400).json({ error: "participant_id is required" });
    return;
  }

  // Get participant
  const { data: participant, error: pErr } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("id", participant_id)
    .single();

  if (pErr || !participant) {
    res.status(400).json({ error: "Participant not found" });
    return;
  }

  // Check if participant has at least one verified submission (any entry)
  const { data: verifiedSubmissions } = await supabaseAdmin
    .from("submissions")
    .select("id, status")
    .eq("participant_id", participant_id)
    .eq("status", "verified")
    .limit(1);

  if (!verifiedSubmissions || verifiedSubmissions.length === 0) {
    res.status(400).json({ error: "Karya belum terverifikasi. Tunggu admin cek dulu ya!" });
    return;
  }

  // Check if already claimed basic (idempotent)
  const { data: existingBasic } = await supabaseAdmin
    .from("prize_codes")
    .select("code, tier")
    .eq("claimed_by", participant_id)
    .eq("tier", "basic")
    .maybeSingle();

  if (existingBasic) {
    const { data: existingPremium } = await supabaseAdmin
      .from("prize_codes")
      .select("code, tier")
      .eq("claimed_by", participant_id)
      .eq("tier", "premium")
      .maybeSingle();

    res.json(existingPremium ?? existingBasic);
    return;
  }

  // Assign a basic code
  const { data: availableCode, error: codeErr } = await supabaseAdmin
    .from("prize_codes")
    .select("id, code, tier")
    .eq("tier", "basic")
    .is("claimed_by", null)
    .limit(1)
    .single();

  if (codeErr || !availableCode) {
    logger.error({ codeErr }, "No basic codes available");
    res.status(400).json({ error: "Stok kode habis. Hubungi panitia AIGYPT!" });
    return;
  }

  // Guard `claimed_by is null` di UPDATE supaya dua request bersamaan
  // tidak bisa dapat kode yang sama (race condition). Kalau kode keburu
  // diambil request lain, `data` kosong → suruh coba lagi.
  const { data: claimed, error: updateErr } = await supabaseAdmin
    .from("prize_codes")
    .update({ claimed_by: participant_id, claimed_at: new Date().toISOString() })
    .eq("id", availableCode.id)
    .is("claimed_by", null)
    .select("code, tier");

  if (updateErr) {
    logger.error({ updateErr }, "Failed to assign prize code");
    res.status(500).json({ error: "Gagal assign kode. Coba lagi." });
    return;
  }

  if (!claimed || claimed.length === 0) {
    res.status(409).json({ error: "Kode keburu diambil. Coba klaim lagi ya!" });
    return;
  }

  res.json({ code: claimed[0].code, tier: claimed[0].tier });
});

export default router;
