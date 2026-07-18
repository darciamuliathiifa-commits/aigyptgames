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

## Mobile performance (18 Jul, batch 2)
Diukur dengan `pnpm run build:vercel` sebelum/sesudah — bukan tebakan:

- **Route-based code splitting penuh**: sebelumnya cuma `Admin`+`Live` yang lazy,
  jadi `Home`/`Join`/`Submit`/`Status`/`Prompt` (dengan `framer-motion` +
  `canvas-confetti` + form libs) ikut ke-download begitu buka `/`. Sekarang
  SEMUA halaman lazy-load kecuali `Hub`. Main bundle gzip turun **251 KB → 168 KB
  (-33%)** untuk load pertama.
- **Marquee poster contoh di mobile duplikasi gambar 3x → 2x** — sebelumnya
  1/3 gambar di-download tapi nggak pernah kelihatan (loop cuma butuh 2 salinan,
  keyframes `marquee` memang `translateX(-50%)`).
- **Blur background dikecilin khusus mobile** (`index.css`, media query
  `max-width: 768px`): blur 120-160px → 40-60px, animasi `blob-drift` dimatikan
  di layar sempit. Blur segede itu mahal buat GPU HP kelas menengah — efek
  glow-nya tetap ada, cuma versi ringannya.

### Belum sempat, kalau mau lanjut lagi:
- Chunk vendor (`proxy-*.js` 126 KB, `types-*.js` 82 KB — dari generated API
  client/zod) masih ikut ke-load di halaman pertama karena Hub manggil
  `useGetSettings`/`useGetLeaderboard`. Bisa dipangkas lebih jauh dengan
  `manualChunks` di `vite.config.ts` kalau builder mau ngoprek lebih dalam.
- Gambar contoh poster (`example_posters`) di-serve apa adanya dari Supabase
  Storage tanpa resize. Supabase Storage punya fitur image transform
  (`?width=&quality=`) — worth dipakai biar gambar yang di-download HP
  otomatis lebih kecil daripada file asli.

## Fitur baru (18 Jul, batch 6)
- **Admin bisa hapus poster/submission** — di tab **Verifikasi** (yang masih
  pending) dan tab **Voting & Juara** (yang udah verified/approved), sekarang
  ada tombol hapus (ikon tempat sampah, warna merah). Klik → muncul konfirmasi
  dulu (nyebut nama pesertanya) → kalau yakin, submission + vote-nya kehapus
  dari database, dan file poster-nya juga dihapus dari Supabase Storage
  (best-effort — kalau file storage-nya gagal kehapus karena sebab lain,
  data DB tetap bersih, nggak nge-block).
  - Endpoint baru: `DELETE /api/admin/submissions/:id` (butuh admin login).
  - Peserta yang postingannya dihapus **entry-nya tetap ada** — mereka bisa
    submit ulang poster baru untuk entry yang sama.
  - Vote dihapus manual dulu sebelum submission (DB nggak punya
    `ON DELETE CASCADE` di FK `votes.submission_id`), pola yang sama kayak
    dipakai pas peserta resubmit poster.
- **Belum ditambahin** (kalau perlu, bilang aja): hapus participant secara
  penuh (lebih riskan — nyangkut entries, submissions, prize_codes sekaligus),
  bulk-delete banyak submission sekaligus, tombol "reject → delete" gabungan.

## Encoding fix batch 2 (18 Jul, batch 6)
- Scan sebelumnya (batch 3) cuma nyari pola `â€` — ketinggalan pola `â`
  polos yang ternyata masih ada di **`Admin.tsx`** (`✓`/`✗`/dash panah, jadi
  `âœ“`/`âœ—`/`â”€`), **`Submit.tsx`**, dan **`Prompt.tsx`** (`→` jadi `â†’`).
  Sekarang sudah di-scan ulang pakai deteksi lebih luas dan **bersih total**
  di seluruh `artifacts/` — sudah diverifikasi otomatis, bukan cek manual.

## Fitur baru (18 Jul, batch 5)
- **Popup lightbox buat lihat poster full-size** — sekarang berlaku di
  `SubmissionCard`, jadi otomatis kepakai di **Galeri** dan **Leaderboard**
  sekaligus (satu komponen, dua halaman). Klik gambar poster → muncul popup
  gede di tengah layar isinya foto full, nama, IG handle, badge juara (kalau
  ada), jumlah vote, dan tombol Vote (kalau voting lagi buka) — jadi bisa
  langsung vote dari dalam popup tanpa nutup dulu.
  Cara nutup: klik tombol X, klik area gelap di luar kartu, atau tekan Esc.
  Klik nama IG di dalam popup tetap buka Instagram di tab baru (nggak ikut
  nutup popup).

## Bug fix (18 Jul, batch 4)
- **"Bucket not found" pas upload Contoh Karya di `/admin`**: `examplePosters.ts`
  upload ke bucket storage `"submissions"` yang **nggak pernah dibuat** —
  yang beneran ada cuma bucket `"posters"` (dibikin di `production.sql`,
  dipakai juga buat upload poster peserta). Kemungkinan typo waktu nyalin
  nama tabel DB (`submissions`) jadi disangka nama bucket. Fix: upload
  sekarang ke bucket `posters`, folder `example-posters/` biar nggak
  numplek sama file upload peserta. Ini murni bug kode — nggak perlu
  bikin bucket baru di Supabase, cukup deploy ulang.

## Encoding fix (18 Jul, batch 3)
- **Mojibake di `Prompt.tsx` dan `Admin.tsx`**: teks kayak `ðŸ“¸`, `â€"` yang
  muncul di UI (bukan cuma emoji rusak, dash `—` dan `…` juga ikut korup)
  itu file aslinya sempat disave lewat editor yang salah baca encoding-nya
  (dibaca sebagai Windows-1252, ditulis ulang sebagai UTF-8 → double-encoded).
  Sudah diperbaiki balik ke UTF-8 murni: 📸 💡 🎉 🏆 🖼️ dan tanda baca
  em-dash/ellipsis sekarang tampil normal. Cek langsung di halaman `/prompt`
  dan tab Verifikasi/Galeri di `/admin`.
- **Saran ke depan**: kalau pakai Replit Agent buat edit file lagi, pastikan
  editor/terminal-nya set locale UTF-8. Kalau muncul lagi karakter aneh
  kayak `Ã¢â‚¬` atau `ðŸ`, itu tanda mojibake — jangan dibiarin, gampang
  menjalar ke file lain tiap kali disave ulang.

## Checklist deploy
1. Jalankan `supabase/migration_v4.sql` di Supabase SQL Editor.
2. Set storage limit bucket `posters` (lihat atas).
3. Pastikan env `ADMIN_SECRET` terisi di Vercel (dipakai signing token admin sekarang).
4. Push → deploy. Cek `/api/healthz`, buka `/` (hub baru), `/challenge`, `/join`, `/admin`.
