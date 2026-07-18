import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// Token admin ditandatangani HMAC-SHA256 pakai ADMIN_SECRET (fallback
// ADMIN_PASSWORD kalau secret belum diset). Password TIDAK PERNAH lagi
// disimpan mentah di cookie.
// Format token: "<expiryEpochMs>.<hexSignature>"

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam

function secret(): string {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createAdminToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifyAdminToken(token: unknown): boolean {
  if (typeof token !== "string" || !secret()) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;

  const expected = sign(exp);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!verifyAdminToken(req.cookies?.admin_token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
