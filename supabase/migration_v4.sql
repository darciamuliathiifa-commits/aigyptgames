-- AIGYPT Poster Challenge — Migration v4: Bugfix + Security Hardening
-- Jalankan di Supabase SQL Editor setelah migration_v3.sql
--
-- Isi:
--   1. FIX: ig_post_url wajib nullable (API insert ig_post_url = null,
--      tapi schema lama "not null" → insert submission GAGAL di DB fresh)
--   2. HARDENING: cabut policy anon yang berbahaya. Semua write & data
--      sensitif sekarang HANYA lewat API (service role). Anon key yang
--      ke-embed di bundle frontend cuma boleh:
--        - SELECT submissions (dibutuhkan Supabase Realtime di
--          Leaderboard/Live/Status)
--        - SELECT settings, anomaly_cards, example_posters (data publik)
--        - Upload + read bucket "posters" (upload poster dari browser)

-- ──────────────────────────────────────────────
-- 1. FIX ig_post_url
-- ──────────────────────────────────────────────
alter table submissions alter column ig_post_url drop not null;

-- ──────────────────────────────────────────────
-- 2. Tutup celah PII: siapapun dengan anon key bisa baca SEMUA
--    email/nama/IG handle peserta. Frontend tidak pernah query
--    participants langsung (semua via API), jadi cabut total.
-- ──────────────────────────────────────────────
drop policy if exists "anon can select own participant" on participants;
drop policy if exists "anon can insert participants" on participants;

-- ──────────────────────────────────────────────
-- 3. Tutup celah manipulasi vote: anon bisa insert/delete votes
--    langsung ke DB, nge-bypass limit 3 vote/device di API.
-- ──────────────────────────────────────────────
drop policy if exists "anon can insert votes" on votes;
drop policy if exists "anon can delete own votes" on votes;
drop policy if exists "anon can select votes" on votes;

-- ──────────────────────────────────────────────
-- 4. Tutup celah tamper submission: policy update "using (true)"
--    artinya siapapun bisa nimpa image_url submission ORANG LAIN.
--    Insert submission juga hanya lewat API.
-- ──────────────────────────────────────────────
drop policy if exists "anon can update own submission" on submissions;
drop policy if exists "anon can insert submissions" on submissions;

-- SELECT submissions TETAP dibiarkan — dibutuhkan Realtime:
--   "anon can select submissions via view" (status pending/verified)

-- ──────────────────────────────────────────────
-- 5. Entries: frontend tidak query langsung, cabut anon read.
-- ──────────────────────────────────────────────
drop policy if exists "anon can read entries" on entries;

-- ──────────────────────────────────────────────
-- 6. (Opsional tapi disarankan) View jalan pakai permission pemilik
--    secara default. Set security_invoker supaya RLS tetap berlaku
--    kalau ada yang query view langsung via PostgREST.
-- ──────────────────────────────────────────────
alter view leaderboard_public set (security_invoker = true);
alter view submission_vote_counts set (security_invoker = true);

-- CATATAN MANUAL (tidak bisa via SQL):
--   Supabase Dashboard → Storage → bucket "posters" →
--   set "File size limit" (mis. 5 MB) dan "Allowed MIME types"
--   (image/webp, image/jpeg, image/png) supaya bucket publik
--   tidak bisa dispam file gede/aneh.
