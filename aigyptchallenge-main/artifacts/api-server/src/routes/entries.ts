import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// POST /entries — create a new entry for a participant (maks 3 per akun)
router.post("/entries", async (req, res) => {
  const { participant_id } = req.body as { participant_id?: string };

  if (!participant_id) {
    res.status(400).json({ error: "participant_id is required" });
    return;
  }

  // Verify participant exists
  const { data: participant, error: pErr } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("id", participant_id)
    .single();

  if (pErr || !participant) {
    res.status(404).json({ error: "Participant not found" });
    return;
  }

  // Count existing entries — server-side enforcement, jangan percaya client
  const { data: existingEntries, error: eErr } = await supabaseAdmin
    .from("entries")
    .select("id, entry_number")
    .eq("participant_id", participant_id)
    .order("entry_number", { ascending: false });

  if (eErr) {
    logger.error({ eErr }, "Failed to count entries");
    res.status(500).json({ error: "Failed to check entry count" });
    return;
  }

  const count = existingEntries?.length ?? 0;
  if (count >= 3) {
    res.status(400).json({
      error: "Jatah percobaan lo udah habis (maks 3 entry per akun)",
    });
    return;
  }

  const nextNumber = count + 1;

  // Pick random active anomaly card (boleh dapat kartu yang sama dengan entry sebelumnya)
  const { data: cards, error: cardErr } = await supabaseAdmin
    .from("anomaly_cards")
    .select("id, emoji, text")
    .eq("active", true);

  if (cardErr || !cards || cards.length === 0) {
    logger.error({ cardErr }, "Failed to fetch anomaly cards");
    res.status(500).json({ error: "Failed to fetch anomaly cards" });
    return;
  }

  const randomCard = cards[Math.floor(Math.random() * cards.length)];

  const { data: entry, error: insertErr } = await supabaseAdmin
    .from("entries")
    .insert({
      participant_id,
      entry_number: nextNumber,
      anomaly_card_id: randomCard.id,
    })
    .select("id, entry_number, participant_id, created_at")
    .single();

  if (insertErr || !entry) {
    logger.error({ insertErr }, "Failed to create entry");
    res.status(500).json({ error: "Failed to create entry" });
    return;
  }

  res.status(201).json({
    ...entry,
    anomaly_card: randomCard,
  });
});

export default router;
