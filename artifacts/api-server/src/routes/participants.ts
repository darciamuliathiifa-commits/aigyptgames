import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

// POST /participants — register participant + assign random anomaly card + create entry #1
router.post("/participants", async (req, res) => {
  const { name, ig_handle, email, wants_class_info } = req.body as {
    name?: string;
    ig_handle?: string;
    email?: string;
    wants_class_info?: boolean;
  };

  if (!name || !ig_handle || !email) {
    res.status(400).json({ error: "name, ig_handle, dan email wajib diisi" });
    return;
  }

  const handle = ig_handle.startsWith("@") ? ig_handle : `@${ig_handle}`;
  const emailLower = email.toLowerCase().trim();

  // Check if email already registered
  const { data: existing } = await supabaseAdmin
    .from("participants")
    .select("id, name, email")
    .eq("email", emailLower)
    .maybeSingle();

  if (existing) {
    res.status(409).json({
      error: "email_taken",
      participant: { id: existing.id, name: existing.name },
    });
    return;
  }

  // Pick random active anomaly card
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

  // Create participant
  const { data: participant, error: insertErr } = await supabaseAdmin
    .from("participants")
    .insert({
      name: name.trim(),
      ig_handle: handle,
      email: emailLower,
      wants_class_info: wants_class_info ?? false,
      anomaly_card_id: randomCard.id, // backward compat
    })
    .select("id, name, ig_handle, email, wants_class_info, anomaly_card_id, created_at")
    .single();

  if (insertErr || !participant) {
    logger.error({ insertErr }, "Failed to insert participant");
    res.status(500).json({ error: "Failed to create participant" });
    return;
  }

  // Create entry #1
  const { data: entry, error: entryErr } = await supabaseAdmin
    .from("entries")
    .insert({
      participant_id: participant.id,
      entry_number: 1,
      anomaly_card_id: randomCard.id,
    })
    .select("id, entry_number")
    .single();

  if (entryErr || !entry) {
    logger.error({ entryErr }, "Failed to create entry #1");
    res.status(500).json({ error: "Failed to create entry" });
    return;
  }

  res.status(201).json({
    ...participant,
    anomaly_card: randomCard,
    active_entry_id: entry.id,
  });
});

// GET /participants/:id — get participant with entries, submissions, and prize status
router.get("/participants/:id", async (req, res) => {
  const { id } = req.params;

  const { data: participant, error: pErr } = await supabaseAdmin
    .from("participants")
    .select("id, name, ig_handle, email, wants_class_info, anomaly_card_id, created_at")
    .eq("id", id)
    .single();

  if (pErr || !participant) {
    res.status(404).json({ error: "Participant not found" });
    return;
  }

  // Fetch all entries with their submissions
  const { data: entriesRaw } = await supabaseAdmin
    .from("entries")
    .select(
      "id, entry_number, anomaly_card_id, created_at, submissions(id, entry_id, image_url, ig_post_url, status, winner_category, created_at, submission_vote_counts(vote_count))"
    )
    .eq("participant_id", id)
    .order("entry_number", { ascending: true });

  // Fetch anomaly cards for all entries
  const cardIds = [
    ...new Set(
      (entriesRaw ?? []).map((e: any) => e.anomaly_card_id).filter(Boolean)
    ),
  ] as string[];

  const cardMap = new Map<string, { id: string; emoji: string; text: string }>();
  if (cardIds.length > 0) {
    const { data: cards } = await supabaseAdmin
      .from("anomaly_cards")
      .select("id, emoji, text")
      .in("id", cardIds);
    (cards ?? []).forEach((c: any) => cardMap.set(c.id, c));
  }

  const entries = (entriesRaw ?? []).map((e: any) => {
    const sub = Array.isArray(e.submissions) ? e.submissions[0] : null;
    return {
      id: e.id,
      entry_number: e.entry_number,
      anomaly_card: cardMap.get(e.anomaly_card_id) ?? null,
      submission: sub
        ? {
            id: sub.id,
            entry_id: sub.entry_id,
            image_url: sub.image_url,
            ig_post_url: sub.ig_post_url,
            status: sub.status,
            winner_category: sub.winner_category ?? null,
            vote_count: Number(sub.submission_vote_counts?.vote_count ?? 0),
            created_at: sub.created_at,
          }
        : null,
      created_at: e.created_at,
    };
  });

  // Fetch claimed prize codes
  const { data: prizes } = await supabaseAdmin
    .from("prize_codes")
    .select("code, tier")
    .eq("claimed_by", id);

  const prize_basic = prizes?.find((p: any) => p.tier === "basic") ?? null;
  const prize_premium = prizes?.find((p: any) => p.tier === "premium") ?? null;

  // Backward compat: expose first entry's anomaly_card and submission at top level
  const firstEntry = entries[0];
  const anomaly_card = firstEntry?.anomaly_card ?? null;
  const submission = firstEntry?.submission ?? null;

  res.json({
    ...participant,
    entries,
    anomaly_card,
    submission,
    prize_basic,
    prize_premium,
  });
});

export default router;
