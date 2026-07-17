import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAdmin } from "../lib/adminAuth";
import { logger } from "../lib/logger";

const router = Router();

// GET /admin/dev-login — DEV ONLY bypass, skip password
router.get("/admin/dev-login", (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const pw = process.env.ADMIN_PASSWORD ?? "devpass";
  res.cookie("admin_token", pw, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
    secure: false,
  });
  res.redirect("/admin");
});

// POST /admin/login
router.post("/admin/login", (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "Admin password not configured" });
    return;
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ authenticated: false, error: "Wrong password" });
    return;
  }

  res.cookie("admin_token", process.env.ADMIN_PASSWORD, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    secure: process.env.NODE_ENV === "production",
  });

  res.json({ authenticated: true });
});

// POST /admin/logout
router.post("/admin/logout", (_req, res) => {
  res.clearCookie("admin_token");
  res.json({ authenticated: false });
});

// GET /admin/auth
router.get("/admin/auth", (req: Request, res: Response) => {
  const token = req.cookies?.admin_token;
  const authenticated = token === process.env.ADMIN_PASSWORD;
  res.json({ authenticated });
});

// GET /admin/submissions?status=pending|verified|rejected
router.get("/admin/submissions", requireAdmin, async (req, res) => {
  const { status } = req.query as { status?: string };

  let query = supabaseAdmin
    .from("submissions")
    .select(`
      id,
      entry_id,
      participant_id,
      image_url,
      ig_post_url,
      status,
      winner_category,
      created_at,
      entries(entry_number, anomaly_card_id),
      participants!inner(name, ig_handle, email, anomaly_card_id),
      submission_vote_counts(vote_count)
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ error }, "Failed to fetch admin submissions");
    res.status(500).json({ error: "Failed to fetch submissions" });
    return;
  }

  // Fetch anomaly cards — prefer entry's card, fallback to participant's card
  const cardIds = [
    ...new Set(
      (data ?? [])
        .map((s: any) => s.entries?.anomaly_card_id ?? s.participants?.anomaly_card_id)
        .filter(Boolean)
    ),
  ] as string[];

  const { data: cards } = await supabaseAdmin
    .from("anomaly_cards")
    .select("id, emoji, text")
    .in("id", cardIds.length > 0 ? cardIds : ["00000000-0000-0000-0000-000000000000"]);

  const cardMap = new Map((cards ?? []).map((c: any) => [c.id, c]));

  const result = (data ?? []).map((s: any) => {
    const cardId = s.entries?.anomaly_card_id ?? s.participants?.anomaly_card_id;
    const card = cardMap.get(cardId);
    return {
      id: s.id,
      entry_number: s.entries?.entry_number ?? null,
      participant_id: s.participant_id,
      participant_name: s.participants?.name ?? "",
      participant_ig: s.participants?.ig_handle ?? "",
      participant_email: s.participants?.email ?? "",
      anomaly_emoji: card?.emoji ?? "",
      anomaly_text: card?.text ?? "",
      image_url: s.image_url,
      ig_post_url: s.ig_post_url,
      status: s.status,
      winner_category: s.winner_category ?? null,
      vote_count: Number(s.submission_vote_counts?.vote_count ?? 0),
      created_at: s.created_at,
    };
  });

  res.json(result);
});

// PUT /admin/submissions/:id
router.put("/admin/submissions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, winner_category } = req.body as {
    status?: string;
    winner_category?: string | null;
  };

  const updates: Record<string, any> = {};
  if (status !== undefined) updates.status = status;
  if (winner_category !== undefined) updates.winner_category = winner_category;

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .update(updates)
    .eq("id", id)
    .select(`
      id,
      entry_id,
      participant_id,
      image_url,
      ig_post_url,
      status,
      winner_category,
      created_at,
      entries(entry_number, anomaly_card_id),
      participants!inner(name, ig_handle, email, anomaly_card_id),
      submission_vote_counts(vote_count)
    `)
    .single();

  if (error) {
    logger.error({ error }, "Failed to update submission");
    res.status(500).json({ error: "Failed to update submission" });
    return;
  }

  // If setting a winner, auto-assign premium code (per win category)
  if (winner_category && winner_category !== null) {
    const participantId = data.participant_id;

    const { data: premCode } = await supabaseAdmin
      .from("prize_codes")
      .select("id")
      .eq("tier", "premium")
      .is("claimed_by", null)
      .limit(1)
      .maybeSingle();

    if (premCode) {
      await supabaseAdmin
        .from("prize_codes")
        .update({ claimed_by: participantId, claimed_at: new Date().toISOString() })
        .eq("id", premCode.id);
    }
  }

  const s: any = data;
  const cardId = s.entries?.anomaly_card_id ?? s.participants?.anomaly_card_id;
  res.json({
    id: s.id,
    entry_number: s.entries?.entry_number ?? null,
    participant_id: s.participant_id,
    participant_name: s.participants?.name ?? "",
    participant_ig: s.participants?.ig_handle ?? "",
    participant_email: s.participants?.email ?? "",
    anomaly_emoji: "",
    anomaly_text: "",
    image_url: s.image_url,
    ig_post_url: s.ig_post_url,
    status: s.status,
    winner_category: s.winner_category ?? null,
    vote_count: Number(s.submission_vote_counts?.vote_count ?? 0),
    created_at: s.created_at,
  });
});

// GET /admin/participants
router.get("/admin/participants", requireAdmin, async (_req, res) => {
  const { data: participants, error } = await supabaseAdmin
    .from("participants")
    .select("id, name, ig_handle, email, wants_class_info, anomaly_card_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ error }, "Failed to fetch participants");
    res.status(500).json({ error: "Failed to fetch participants" });
    return;
  }

  const cardIds = [
    ...new Set(
      (participants ?? []).map((p: any) => p.anomaly_card_id).filter(Boolean)
    ),
  ] as string[];

  const { data: cards } = await supabaseAdmin
    .from("anomaly_cards")
    .select("id, emoji, text")
    .in("id", cardIds.length > 0 ? cardIds : ["00000000-0000-0000-0000-000000000000"]);
  const cardMap = new Map((cards ?? []).map((c: any) => [c.id, c]));

  const pIds = (participants ?? []).map((p: any) => p.id);

  // Fetch entries count per participant
  const { data: allEntries } = await supabaseAdmin
    .from("entries")
    .select("participant_id")
    .in("participant_id", pIds.length > 0 ? pIds : ["00000000-0000-0000-0000-000000000000"]);

  const entryCountMap = new Map<string, number>();
  for (const e of allEntries ?? []) {
    entryCountMap.set(e.participant_id, (entryCountMap.get(e.participant_id) ?? 0) + 1);
  }

  // Fetch submissions (best status per participant: prefer verified > pending > rejected)
  const { data: submissions } = await supabaseAdmin
    .from("submissions")
    .select("participant_id, status")
    .in(
      "participant_id",
      pIds.length > 0 ? pIds : ["00000000-0000-0000-0000-000000000000"]
    );

  // Per participant: pick "best" status
  const submMap = new Map<string, string>();
  for (const s of submissions ?? []) {
    const current = submMap.get(s.participant_id);
    const priority: Record<string, number> = { verified: 3, pending: 2, rejected: 1 };
    if (!current || (priority[s.status] ?? 0) > (priority[current] ?? 0)) {
      submMap.set(s.participant_id, s.status);
    }
  }

  const { data: prizes } = await supabaseAdmin
    .from("prize_codes")
    .select("claimed_by, tier")
    .in(
      "claimed_by",
      pIds.length > 0 ? pIds : ["00000000-0000-0000-0000-000000000000"]
    );
  const prizeMap = new Map<string, { tier: string }[]>();
  for (const p of prizes ?? []) {
    if (!prizeMap.has(p.claimed_by)) prizeMap.set(p.claimed_by, []);
    prizeMap.get(p.claimed_by)!.push({ tier: p.tier });
  }

  const result = (participants ?? []).map((p: any) => {
    const card = cardMap.get(p.anomaly_card_id);
    const bestStatus = submMap.get(p.id) ?? null;
    const myPrizes = prizeMap.get(p.id) ?? [];
    const premiumPrize = myPrizes.find((pr) => pr.tier === "premium");
    const basicPrize = myPrizes.find((pr) => pr.tier === "basic");
    return {
      id: p.id,
      name: p.name,
      ig_handle: p.ig_handle,
      email: p.email ?? "",
      wants_class_info: p.wants_class_info,
      entry_count: entryCountMap.get(p.id) ?? 0,
      anomaly_emoji: card?.emoji ?? "",
      anomaly_text: card?.text ?? "",
      submission_status: bestStatus,
      prize_claimed: myPrizes.length > 0,
      prize_tier: premiumPrize?.tier ?? basicPrize?.tier ?? null,
      created_at: p.created_at,
    };
  });

  res.json(result);
});

// GET /admin/prizes
router.get("/admin/prizes", requireAdmin, async (_req, res) => {
  const { data: codes, error } = await supabaseAdmin
    .from("prize_codes")
    .select("id, code, tier, claimed_by, claimed_at")
    .order("tier")
    .order("claimed_at", { ascending: false, nullsFirst: false });

  if (error) {
    logger.error({ error }, "Failed to fetch prize codes");
    res.status(500).json({ error: "Failed to fetch prize codes" });
    return;
  }

  const claimerIds = [
    ...new Set((codes ?? []).map((c: any) => c.claimed_by).filter(Boolean)),
  ] as string[];
  const { data: claimers } = await supabaseAdmin
    .from("participants")
    .select("id, name")
    .in(
      "id",
      claimerIds.length > 0 ? claimerIds : ["00000000-0000-0000-0000-000000000000"]
    );
  const claimerMap = new Map((claimers ?? []).map((c: any) => [c.id, c.name]));

  const enrichedCodes = (codes ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    tier: c.tier,
    claimed_by: c.claimed_by ?? null,
    claimer_name: c.claimed_by ? (claimerMap.get(c.claimed_by) ?? null) : null,
    claimed_at: c.claimed_at ?? null,
  }));

  const allCodes = codes ?? [];
  const tiers = ["basic", "premium"];
  const stats = tiers.map((tier) => {
    const total = allCodes.filter((c: any) => c.tier === tier).length;
    const remaining = allCodes.filter((c: any) => c.tier === tier && !c.claimed_by).length;
    return { tier, total, remaining };
  });

  res.json({ codes: enrichedCodes, stats });
});

// POST /admin/prizes — bulk add
router.post("/admin/prizes", requireAdmin, async (req, res) => {
  const { codes, tier } = req.body as { codes?: string[]; tier?: string };

  if (!codes || !Array.isArray(codes) || !tier) {
    res.status(400).json({ error: "codes (array) and tier are required" });
    return;
  }

  if (!["basic", "premium"].includes(tier)) {
    res.status(400).json({ error: "tier must be basic or premium" });
    return;
  }

  const rows = codes.filter((c) => c.trim()).map((c) => ({ code: c.trim(), tier }));

  if (rows.length === 0) {
    res.status(400).json({ error: "No valid codes provided" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("prize_codes")
    .insert(rows)
    .select("id");

  if (error) {
    logger.error({ error }, "Failed to insert prize codes");
    res.status(500).json({ error: "Failed to add codes. Some may be duplicates." });
    return;
  }

  res.status(201).json({ added: data?.length ?? 0 });
});

// PUT /admin/settings
router.put("/admin/settings", requireAdmin, async (req, res) => {
  const { deadline_submit, voting_open } = req.body as {
    deadline_submit?: string;
    voting_open?: string;
  };

  const updates: { key: string; value: string }[] = [];
  if (deadline_submit !== undefined) updates.push({ key: "deadline_submit", value: deadline_submit });
  if (voting_open !== undefined) updates.push({ key: "voting_open", value: voting_open });

  for (const u of updates) {
    await supabaseAdmin
      .from("settings")
      .upsert({ key: u.key, value: u.value }, { onConflict: "key" });
  }

  const { data } = await supabaseAdmin.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;

  res.json({
    deadline_submit: settings.deadline_submit ?? "",
    voting_open: settings.voting_open ?? "false",
  });
});

export default router;
