import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

const VALID_TRACKS = ["image", "text", "music", "code"] as const;
type Track = (typeof VALID_TRACKS)[number];

// GET /racik/blocks — semua balok aktif, dikelompokkan per track & kategori.
// Kategori 'tantangan' TIDAK ikut dikirim di sini (itu digacha terpisah
// lewat /racik/gacha biar peserta nggak bisa milih sendiri).
router.get("/racik/blocks", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("prompt_blocks")
    .select("id, track, category, label, prompt_id, prompt_en, tooltip, emoji, sort_order")
    .eq("active", true)
    .neq("category", "tantangan")
    .order("sort_order");

  if (error) {
    logger.error({ error }, "Failed to fetch prompt blocks");
    res.status(500).json({ error: "Gagal ambil balok prompt" });
    return;
  }

  res.json(data ?? []);
});

// GET /racik/gacha?track=image — gacha 1 kartu tantangan random dari track itu
router.get("/racik/gacha", async (req, res) => {
  const track = String(req.query.track ?? "");
  if (!VALID_TRACKS.includes(track as Track)) {
    res.status(400).json({ error: "track tidak valid" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("prompt_blocks")
    .select("id, track, category, label, prompt_id, prompt_en, tooltip, emoji")
    .eq("active", true)
    .eq("track", track)
    .eq("category", "tantangan");

  if (error || !data || data.length === 0) {
    logger.error({ error }, "Failed to gacha tantangan block");
    res.status(500).json({ error: "Gagal gacha kartu tantangan" });
    return;
  }

  const picked = data[Math.floor(Math.random() * data.length)];
  res.json(picked);
});

// POST /racik/submissions — submit karya racikan
// Body: { participant_id, track, block_ids: string[], tantangan_block_id,
//         image_url? (track image), content_text? (track text),
//         content_url? (track music/code) }
router.post("/racik/submissions", async (req, res) => {
  const {
    participant_id,
    track,
    block_ids,
    tantangan_block_id,
    image_url,
    content_text,
    content_url,
  } = req.body as {
    participant_id?: string;
    track?: string;
    block_ids?: string[];
    tantangan_block_id?: string;
    image_url?: string;
    content_text?: string;
    content_url?: string;
  };

  if (!participant_id || !track || !VALID_TRACKS.includes(track as Track)) {
    res.status(400).json({ error: "participant_id dan track (valid) wajib diisi" });
    return;
  }

  if (!Array.isArray(block_ids) || block_ids.length === 0) {
    res.status(400).json({ error: "Pilih minimal satu balok dulu ya" });
    return;
  }

  // Validasi konten sesuai jalur
  if (track === "image" && !image_url?.trim()) {
    res.status(400).json({ error: "Jalur gambar butuh upload gambar" });
    return;
  }
  if (track === "text" && !content_text?.trim()) {
    res.status(400).json({ error: "Jalur tulisan butuh teks karyanya" });
    return;
  }
  if ((track === "music" || track === "code") && !content_url?.trim()) {
    res.status(400).json({ error: "Jalur ini butuh link hasil karyanya" });
    return;
  }

  // Pastikan peserta ada
  const { data: participant } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("id", participant_id)
    .maybeSingle();

  if (!participant) {
    res.status(404).json({ error: "Peserta tidak ditemukan — daftar dulu ya" });
    return;
  }

  const { data: submission, error } = await supabaseAdmin
    .from("submissions")
    .insert({
      participant_id,
      track,
      block_ids,
      tantangan_block_id: tantangan_block_id || null,
      image_url: image_url?.trim() || null,
      content_text: content_text?.trim() || null,
      content_url: content_url?.trim() || null,
      ig_post_url: null,
      ig_tag_confirmed: false,
      status: "pending",
    })
    .select("id, track, status, created_at")
    .single();

  if (error) {
    logger.error({ error }, "Failed to create racik submission");
    res.status(500).json({ error: "Gagal submit karya. Coba lagi ya." });
    return;
  }

  res.status(201).json(submission);
});

export default router;
