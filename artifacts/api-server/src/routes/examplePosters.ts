import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAdmin } from "../lib/adminAuth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/example-posters — public, active only
router.get("/example-posters", async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("example_posters")
    .select("id, image_url, caption, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    logger.error({ error }, "Failed to fetch example_posters");
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// GET /api/admin/example-posters — all rows for admin
router.get("/admin/example-posters", requireAdmin, async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("example_posters")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST /api/admin/example-posters — upload new poster
router.post("/admin/example-posters", requireAdmin, async (req: Request, res: Response) => {
  const { image_base64, mime_type, caption, sort_order } = req.body as {
    image_base64: string;
    mime_type: string;
    caption?: string;
    sort_order?: number;
  };

  if (!image_base64 || !mime_type) {
    res.status(400).json({ error: "image_base64 and mime_type are required" });
    return;
  }

  // Upload to Supabase storage
  const buffer = Buffer.from(image_base64, "base64");
  const ext = mime_type.split("/")[1] || "jpg";
  const filename = `example-posters/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("submissions")
    .upload(filename, buffer, { contentType: mime_type, upsert: false });

  if (uploadError) {
    logger.error({ error: uploadError }, "Failed to upload example poster");
    res.status(500).json({ error: uploadError.message });
    return;
  }

  const { data: urlData } = supabaseAdmin.storage.from("submissions").getPublicUrl(filename);
  const image_url = urlData.publicUrl;

  const { data, error } = await supabaseAdmin
    .from("example_posters")
    .insert({ image_url, caption: caption || null, sort_order: sort_order ?? 0, active: true })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// PATCH /api/admin/example-posters/:id — update caption, sort_order, active
router.patch("/admin/example-posters/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as { caption?: string; sort_order?: number; active?: boolean };

  const { data, error } = await supabaseAdmin
    .from("example_posters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// DELETE /api/admin/example-posters/:id
router.delete("/admin/example-posters/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from("example_posters")
    .delete()
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ deleted: true });
});

export default router;
