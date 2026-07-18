# CHANGES — Audit & Fix (18 Jul 2026)

## Fitur baru
- **`/` sekarang AIGYPT Games Hub** (`src/pages/Hub.tsx`) — user langsung disambut menu game.
  Poster Challenge = LIVE → mengarah ke `/challenge`. Ada 2 slot "Segera Hadir" untuk fase 2.
- Halaman poster challenge lama pindah dari `/` ke `/challenge`. Semua route lain
  (`/join`, `/submit`, `/gallery`, dst.) tidak berubah, link lama tetap jalan.
- Fase 2: tambah game baru cukup tambah objek di array `GAMES` di `Hub.tsx`.

## Bug fix (runtime, beneran kejadian di produksi)
1. **Submit gagal di DB fresh** — schema `submissions.ig_post_url` masih `not null`,
   padahal API insert `null`. Fix: `migration_v4.sql` (WAJIB dijalankan di Supabase).
2. **Halaman `/prompt` crash** — ikon `Download` dipakai tapi tidak di-import.
3. **Tab admin Verifikasi/Galeri tidak terfilter** — params dikirim sebagai
   `{ query: { status } }` (salah posisi) sehingga backend terima `?query=[object Object]`
   dan mengembalikan SEMUA submission di kedua tab. Fix: `{ status: 'pending' }`.
4. **Animasi scroll di `/live` mati** — typo `dangerouslySetInline` → `dangerouslySetInnerHTML`.
5. **Race condition klaim kode AINA** — dua klaim bersamaan bisa dapat kode yang sama.
   Fix: guard `claimed_by is null` pada UPDATE di `routes/prizes.ts`.

## Security hardening
- **`migration_v4.sql`** mencabut policy RLS berbahaya:
  - Anon key (ke-embed di bundle frontend!) sebelumnya bisa baca **email semua peserta**,
    insert/delete votes langsung (bypass limit 3 vote/device), dan menimpa submission
    orang lain. Sekarang semua write hanya lewat API (service role).
  - Anon SELECT `submissions` sengaja dipertahankan — dibutuhkan Supabase Realtime.
- **Admin auth**: cookie tidak lagi menyimpan password mentah. Sekarang token
  HMAC-SHA256 bertanda tangan `ADMIN_SECRET` + expiry 8 jam (`lib/adminAuth.ts`).
- **TODO manual di Supabase Dashboard**: Storage → bucket `posters` → set file size
  limit (mis. 5 MB) + allowed MIME types (image/webp, image/jpeg, image/png).

## Kesehatan repo
- **OpenAPI spec disinkronkan** dengan backend asli (SubmissionInput, ParticipantInput,
  ParticipantWithStatus.entries, Entry, EntrySubmission, AdminSubmission, AdminParticipant)
  lalu client di-regenerate via orval. Sebelumnya file generated di-edit manual → drift.
  Aturan ke depan: **jangan edit file `generated/`; edit `openapi.yaml` lalu
  `pnpm --filter @workspace/api-spec run codegen`.**
- `pnpm run typecheck` sekarang **0 error** (sebelumnya gagal; 24 error tersembunyi).
  `artifacts/aigypt-video` (scrap video Replit) dikecualikan dari typecheck.
- `Admin` & `Live` di-lazy-load → bundle utama turun ~80 KB, halaman berat load terpisah.
- BOM/mojibake di `routes/submissions.ts` dibersihkan.
- File video besar (`aigyptchallenge-*.mp4` 21 MB, `aigypt-video/.../bg-abstract.mp4` 41 MB)
  TIDAK diikutkan di paket ini — sebaiknya memang dihapus dari repo (bikin clone/deploy berat).

## Checklist deploy
1. Jalankan `supabase/migration_v4.sql` di Supabase SQL Editor.
2. Set storage limit bucket `posters` (lihat atas).
3. Pastikan env `ADMIN_SECRET` terisi di Vercel (dipakai signing token admin sekarang).
4. Push → deploy. Cek `/api/healthz`, buka `/` (hub baru), `/challenge`, `/join`, `/admin`.
