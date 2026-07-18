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

## Redesign navbar floating + grid card Hub + scoped links (18 Jul, batch 12)
- **Navbar sekarang floating** — sebelumnya nempel penuh dari tepi kiri
  ke kanan layar (edge-to-edge). Sekarang jadi kartu melayang dengan jarak
  dari tepi (`px-3 pt-3` di HP, lebih lebar di desktop), rounded corner,
  border, dan bayangan — selalu kelihatan sebagai "kartu", bukan cuma pas
  di-scroll doang. Dropdown menu mobile juga ikut jadi kartu yang senada.
- **Presisi logo diperbaiki** — icon AIGYPT dibesarin dikit (28px→32px)
  biar proporsinya pas sama font judul baru (Unbounded, yang secara
  visual lebih tebal/lebar dari font lama), dan container teksnya diganti
  jadi flex-col yang lebih presisi buat vertical-center. **Catatan
  jujur**: presisi pixel-perfect ini agak sulit gue pastiin 100% tanpa
  liat langsung di browser lo — kalau masih kerasa kurang center, kasih
  tau, gampang di-tweak lagi.
- **Kartu pilihan game di Hub sekarang berjejer** — sebelumnya numpuk ke
  bawah 1 kolom terus (`flex-col`), sekarang jadi grid: 1 kolom di HP,
  3 kolom sejajar di desktop/tablet (`md:grid-cols-3`). Card juga dirombak
  dari layout horizontal (ikon-kiri, teks-kanan) jadi vertical (ikon-atas,
  cocok buat kolom sempit), dan tinggi antar-card disamain (`items-stretch`)
  biar rapi pas berjejer.
- **Link "Galeri & Vote" / "Leaderboard" dipindah** dari section terpisah
  di bawah Hub (dulu berlaku seolah-olah buat semua game) ke DALAM card
  "AI Poster Challenge" doang — soalnya bener kata bro, galeri/leaderboard
  itu spesifik punya game Poster Challenge, game lain (fase 2 nanti)
  belum tentu punya konsep yang sama.

## Perubahan tampilan & nada tulisan (18 Jul, batch 11)
- **Gambar poster mengambang digeser turun** — sebelumnya nangkring di
  pojok atas (4-10% dari atas), nabrak visual sama baris navbar. Sekarang
  digeser ke area 55-90%, sejajar sama tombol "Tarik Kartu" dan countdown
  di bawahnya. **Catatan jujur**: posisi ini dihitung berdasarkan proporsi
  konten (badge → judul → deskripsi → tombol → countdown), bukan hasil
  lihat langsung di browser — kemungkinan perlu digeser dikit lagi kalau
  di device asli ternyata belum pas persis. Kalau masih kurang pas,
  kasih tau posisi yang lo mau (lebih tinggi/rendah), gampang di-tweak.

- **Nada tulisan diganti dari "lo/gue" ke "kamu"** di SELURUH halaman
  publik (Hub, Home/Challenge, Join, Submit, Status, Prompt) — 16 baris
  total di 6 file. Tetap santai dan penuh energi (emoji, tanda seru,
  kata-kata kayak "ngegas"/"gacha" masih dipertahankan), cuma kata ganti
  orangnya lebih sopan. Panel admin (`Admin.tsx`) sengaja nggak disentuh
  karena itu tool internal buat panitia, bukan halaman publik.

- **Font judul diganti dari Plus Jakarta Sans ke Unbounded** — biar lebih
  berkarakter dan "gede" secara visual, cocok sama vibe poster/gaming-nya
  AIGYPT. Body text tetap Plus Jakarta Sans. **Catatan jujur juga**:
  Unbounded itu font yang lebar/tebal — kalau di headline gede banget
  (judul utama di halaman Home) kerasa terlalu berat/padet, kasih tau,
  gampang diganti ke alternatif lain yang lebih ramping (misalnya
  Big Shoulders Display, cocok juga buat vibe poster tapi lebih ramping).

## Redesign navbar (18 Jul, batch 10)
- **Bug yang ketemu**: navbar SELALU nampilin menu "Galeri / Skor / Misi",
  bahkan pas lagi di halaman **Hub** (menu pilihan game) — padahal di situ
  user belum masuk ke game manapun. Menu itu nggak relevan di sana dan
  bikin bingung ("Misi" apaan kalau belum pilih game?).
- **Fix**: navbar sekarang sadar konteks halaman:
  - Di **Hub** (`/`) → cuma logo, bersih, nggak ada menu game.
  - Di dalam **Poster Challenge** (`/challenge`, `/join`, `/submit`,
    `/status`, `/prompt`, `/gallery`, `/leaderboard`) → menu Galeri/Skor/Misi
    tampil seperti biasa.
  - Logo sekarang nampilin label kecil "‹ Poster Challenge" di bawah teks
    "AIGYPT" pas lagi di dalam game itu — kasih konteks "lagi ada di game
    mana" sekaligus jadi hint kalau klik logo balik ke menu semua game.
- **Active-state indicator** — link "Galeri"/"Skor" yang lagi aktif sekarang
  kelihatan jelas (warna primary + garis bawah tipis), sebelumnya semua
  link keliatan sama terus nggak ada tanda lagi di halaman mana.
- Menu dropdown mobile juga dapet active-state yang sama, plus tambahan
  link "Semua Game" di paling bawah buat balik ke Hub.

## Perubahan tampilan (18 Jul, batch 9)
- **Font judul (headline) sekarang Plus Jakarta Sans** — sebelumnya semua
  `<h1>`-`<h6>` di seluruh situs pakai Space Grotesk, teks biasa pakai
  Plus Jakarta Sans (dua keluarga font beda). Sekarang disatukan jadi
  Plus Jakarta Sans semua, judul & body serasi. Bonus: satu font family
  lebih dikit di-load dari Google Fonts = dikit lebih ringan/cepet juga.
- **Headline halaman utama Hub diganti** dari "PILIH GAME LO" jadi
  "PILIH GAME SERUMU 🎲" — nada tetap ramai/seru, tanpa bahasa gaul
  "lo/gue". Sisa copy di Hub (subtitle, tombol "Gas Main", dst) udah
  dicek, memang dari awal nggak pakai lo/gue.
  - **Catatan**: halaman lain (Home/`/challenge`, Join, Submit, Status,
    Prompt) itu teks aslinya dari repo sebelum gue pegang, dan memang
    banyak pakai gaya "lo/gue" di seluruh body copy (bukan cuma judul).
    Kalau mau nada itu diganti juga di halaman-halaman itu (bukan cuma
    judul Hub), bilang aja — itu revisi copy yang lebih luas, sengaja
    belum disentuh sekarang biar nggak mengubah suara/branding yang
    mungkin memang sengaja dipilih buat challenge ini.

## Fitur baru (18 Jul, batch 7)
- **Admin bisa hapus peserta (buat bersihin spam/duplikat)** — tab baru
  di **Leads**, tiap baris peserta ada tombol hapus (ikon tempat sampah).
  Klik → konfirmasi dulu (sebut nama) → kalau yakin, SEMUA data peserta itu
  kehapus permanen: entry (max 3), submission/poster, vote yang dia kasih
  ke poster lain, dan file gambar di storage. Kode hadiah yang sempat dia
  klaim **dikembalikan ke pool** (bukan ikut kehapus), jadi masih bisa
  diklaim peserta lain yang sah.
  - Endpoint baru: `DELETE /api/admin/participants/:id`.
  - Urutan hapus: votes → submissions → entries → unclaim prize_codes →
    participant → file storage (best-effort, di paling akhir).

- **Tab baru "Anomali" di admin panel** — biar nggak perlu buka Supabase
  SQL Editor tiap mau nambah pilihan anomali, sekarang bisa dari UI:
  - Tambah kartu baru (emoji + deskripsi)
  - Toggle aktif/nonaktif per kartu — kartu nonaktif nggak bakal keundi ke
    peserta baru, tapi nggak dihapus permanen (biar histori peserta lama
    yang udah kepilih kartu itu nggak putus/orphan)
  - Endpoint baru: `GET/POST /api/admin/anomaly-cards`,
    `PATCH /api/admin/anomaly-cards/:id`

- **Total pilihan anomali sekarang 27** (diminta minimal 15+) — 25 kartu
  lama + 2 kartu baru (ular kobra, kalajengking mekanik). Lihat
  `migration_v5.sql`.

## Bug fix tersembunyi yang ikut kebongkar (18 Jul, batch 7)
- **Seed kartu anomali punya `ON CONFLICT DO NOTHING` yang sebenernya nggak
  pernah efektif** — tabel `anomaly_cards` cuma punya unique constraint di
  `id` (yang selalu random tiap insert), jadi kalau seed-nya sempat
  kejalanin lebih dari sekali di database lo, kartunya bisa dobel diam-diam
  tanpa ketahuan (ganggu keadilan random-pick, walau nggak bikin app error).
  `migration_v5.sql` bersihin duplikat yang mungkin udah kejadian (peserta
  yang nempel ke kartu duplikat dipindah ke kartu yang dipertahankan,
  bukan di-orphan), sekalian nambahin unique constraint yang bener biar
  `ON CONFLICT` beneran jalan ke depannya.

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
1. Jalankan `supabase/migration_v4.sql` di Supabase SQL Editor (kalau kemarin belum).
2. Jalankan `supabase/migration_v5.sql` di Supabase SQL Editor (baru — dedup +
   top-up kartu anomali jadi 27 pilihan).
3. Set storage limit bucket `posters` (lihat atas).
4. Pastikan env `ADMIN_SECRET` terisi di Vercel (dipakai signing token admin sekarang).
5. Push → deploy. Cek `/api/healthz`, buka `/` (hub baru), `/challenge`, `/join`, `/admin`.
