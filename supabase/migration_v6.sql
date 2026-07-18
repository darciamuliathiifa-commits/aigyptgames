-- AIGYPT Games — Migration v6: Game "Racik Prompt" (4 jalur)
-- Jalankan di Supabase SQL Editor setelah migration_v5.sql
--
-- Game kedua: peserta menyusun prompt dari balok pilihan (bukan copy-paste),
-- lihat prompt-nya terbentuk live, jalankan di AI, submit hasilnya.
-- 4 jalur: image (gambar), text (tulisan), music (musik/Suno), code (mini app).

-- ──────────────────────────────────────────────
-- 1. Tabel balok prompt
-- ──────────────────────────────────────────────
create table if not exists prompt_blocks (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('image', 'text', 'music', 'code')),
  category text not null,
  label text not null,          -- teks yang tampil di UI (Indonesia)
  prompt_id text not null,      -- fragmen prompt bahasa Indonesia
  prompt_en text not null,      -- fragmen prompt bahasa Inggris
  tooltip text not null,        -- penjelasan "kenapa" 1 kalimat (edukasi)
  emoji text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  unique (track, category, label)
);

alter table prompt_blocks enable row level security;
-- Publik boleh baca balok aktif (dipakai halaman Meja Racik via API,
-- tapi kasih read anon juga aman — tidak ada data sensitif)
drop policy if exists "anon can read active prompt blocks" on prompt_blocks;
create policy "anon can read active prompt blocks"
  on prompt_blocks for select to anon using (active = true);

-- ──────────────────────────────────────────────
-- 2. Kolom baru di submissions (nullable — submission poster lama tetap valid)
--    track null = poster challenge lama.
-- ──────────────────────────────────────────────
alter table submissions add column if not exists track text
  check (track in ('image', 'text', 'music', 'code'));
alter table submissions add column if not exists content_text text;
alter table submissions add column if not exists content_url text;
alter table submissions add column if not exists block_ids jsonb;
alter table submissions add column if not exists tantangan_block_id uuid references prompt_blocks(id);
-- Kolom ini sudah di-insert oleh kode sejak lama tapi TIDAK PERNAH ada di
-- file SQL manapun (kemungkinan ditambah manual ke DB live) — diamankan
-- di sini biar fresh install juga jalan:
alter table submissions add column if not exists ig_tag_confirmed boolean not null default false;
-- image_url jadi opsional untuk jalur non-gambar
alter table submissions alter column image_url drop not null;

-- ──────────────────────────────────────────────
-- 3. Upgrade view leaderboard_public: bawa kolom racik
--    CATATAN: view di DB live ternyata punya kolom entry_id (ditambah
--    langsung ke DB, nggak lewat file SQL repo — drift). CREATE OR REPLACE
--    nggak bisa mengubah susunan kolom view, jadi harus DROP dulu.
--    entry_id ikut dipertahankan di definisi baru biar konsumen manapun
--    yang mungkin memakainya tetap jalan.
-- ──────────────────────────────────────────────
drop view if exists leaderboard_public;

create view leaderboard_public as
  select
    s.id as submission_id,
    s.entry_id,
    p.name,
    p.ig_handle,
    ac.emoji,
    ac.text as anomaly_text,
    s.image_url,
    s.status,
    s.winner_category,
    coalesce(v.vote_count, 0) as vote_count,
    s.created_at,
    s.track,
    s.content_text,
    s.content_url,
    tb.label as tantangan_label,
    tb.emoji as tantangan_emoji
  from submissions s
  join participants p on p.id = s.participant_id
  left join anomaly_cards ac on ac.id = p.anomaly_card_id
  left join prompt_blocks tb on tb.id = s.tantangan_block_id
  left join submission_vote_counts v on v.submission_id = s.id
  where s.status in ('pending', 'verified');

alter view leaderboard_public set (security_invoker = true);

-- ──────────────────────────────────────────────
-- 4. Seed balok — 4 jalur × 5 kategori (termasuk 'tantangan' yang digacha)
-- ──────────────────────────────────────────────
insert into prompt_blocks (track, category, label, prompt_id, prompt_en, tooltip, emoji, sort_order) values

-- ═══ JALUR GAMBAR ═══
('image','subjek','Tenant AIGYPT','poster tenant/booth AIGYPT','a poster of the AIGYPT community booth/tent','Subjek adalah hal utama yang AI gambar — makin spesifik, makin fokus hasilnya.','🏕️',1),
('image','subjek','Suasana Kairo','pemandangan kota Kairo dengan piramida di kejauhan','a Cairo cityscape with pyramids in the distance','Menyebut lokasi nyata bikin AI menarik referensi visual khas tempat itu.','🌆',2),
('image','subjek','Mahasiswa Masisir','sekelompok mahasiswa Indonesia di Mesir sedang belajar bersama','a group of Indonesian students in Egypt studying together','AI menggambar orang lebih baik kalau diberi konteks aktivitas, bukan cuma "orang".','🧑‍🎓',3),
('image','gaya','Sinematik','gaya sinematik seperti poster film','cinematic movie-poster style','Kata "cinematic" dikenali semua model AI — otomatis dapat komposisi dramatis ala film.','🎬',1),
('image','gaya','Anime','gaya anime Jepang dengan garis bersih','clean Japanese anime style','Menyebut gaya seni spesifik jauh lebih efektif daripada kata umum seperti "bagus".','🍥',2),
('image','gaya','Pixel Art','gaya pixel art retro 16-bit','retro 16-bit pixel art style','Istilah teknis (16-bit) memberi AI batasan jelas — hasilnya lebih konsisten.','👾',3),
('image','cahaya','Golden Hour','pencahayaan golden hour matahari terbenam','warm golden hour sunset lighting','"Golden hour" adalah istilah fotografi — AI langsung paham nuansa oranye hangatnya.','🌇',1),
('image','cahaya','Neon Malam','lampu neon ungu-biru di malam hari','purple-blue neon lights at night','Warna cahaya menentukan mood — neon memberi kesan futuristik/urban.','🌃',2),
('image','cahaya','Cahaya Lilin','pencahayaan lilin yang hangat dan temaram','warm dim candlelight','Cahaya redup mengarahkan AI ke suasana intim dan misterius.','🕯️',3),
('image','mood','Epik','suasana epik dan megah','epic and grand atmosphere','Kata mood memandu keseluruhan "rasa" gambar, dari pose sampai warna langit.','⚡',1),
('image','mood','Hangat','suasana hangat dan bersahabat','warm and friendly atmosphere','Mood hangat bikin AI memilih warna lembut dan ekspresi ramah.','🤗',2),
('image','mood','Misterius','suasana misterius berkabut','mysterious foggy atmosphere','Mood misterius mendorong AI menambah bayangan dan elemen tersembunyi.','🌫️',3),
('image','detail','Partikel Cahaya','partikel cahaya melayang di udara','floating light particles in the air','Detail kecil seperti partikel bikin gambar terasa "hidup" dan mahal.','✨',1),
('image','detail','Refleksi Air','refleksi di genangan air','reflections in water puddles','Refleksi menambah kedalaman — trik yang dipakai fotografer profesional.','💧',2),
('image','detail','Keramaian','keramaian orang di latar belakang','a lively crowd in the background','Latar yang ramai memberi skala dan energi pada subjek utama.','👥',3),
('image','tantangan','Harus Ada Unsur Air','wajib ada elemen air di dalam gambar','must include a water element','Tantangan melatih kreativitas: gimana caranya air masuk ke konsepmu?','🌊',1),
('image','tantangan','Harus Ada Hewan','wajib ada minimal satu hewan','must include at least one animal','Batasan justru memicu ide — hewan apa yang cocok dengan konsepmu?','🐫',2),
('image','tantangan','Harus Ada Elemen Terbang','wajib ada sesuatu yang melayang/terbang','something must be flying or floating','Elemen melayang bikin komposisi lebih dinamis — dan lebih menantang!','🎈',3),

-- ═══ JALUR TULISAN ═══
('text','format','Cerpen 3 Paragraf','tulis cerita pendek 3 paragraf','write a 3-paragraph short story','Memberi batasan panjang bikin AI menulis padat, bukan bertele-tele.','📖',1),
('text','format','Puisi','tulis puisi 4 bait','write a 4-stanza poem','Menyebut jumlah bait memberi struktur — AI paham bentuk puisi klasik.','🪶',2),
('text','format','Thread Edukasi','tulis thread edukasi 5 poin','write a 5-point educational thread','Format thread memaksa AI memecah ide besar jadi poin yang mudah dicerna.','🧵',3),
('text','sudut_pandang','Orang Pertama','dari sudut pandang orang pertama (aku)','from a first-person perspective','Sudut pandang "aku" bikin tulisan terasa personal dan dekat.','🙋',1),
('text','sudut_pandang','Narator Misterius','dari sudut pandang narator misterius yang serba tahu','from an omniscient mysterious narrator','Narator serba tahu memberi kesan dongeng — AI menyesuaikan nada bercerita.','🎭',2),
('text','sudut_pandang','Surat','dalam bentuk surat untuk seseorang','in the form of a letter to someone','Format surat otomatis memunculkan emosi dan keintiman dalam tulisan.','💌',3),
('text','gaya_bahasa','Formal Puitis','dengan bahasa formal yang puitis','in formal poetic language','Gaya bahasa menentukan pilihan kata AI — puitis berarti banyak majas.','🎩',1),
('text','gaya_bahasa','Santai Receh','dengan bahasa santai dan humor receh','in casual language with silly humor','AI bisa melucu kalau diminta eksplisit — sebut jenis humornya.','🤪',2),
('text','gaya_bahasa','Ala Dongeng','dengan gaya dongeng pengantar tidur','in bedtime fairytale style','Gaya dongeng memicu pola "pada suatu hari" dan pesan moral di akhir.','🌙',3),
('text','twist','Ending Kebalik','dengan ending yang berkebalikan dari dugaan','with an ending opposite to expectations','Meminta twist eksplisit mencegah AI menulis ending yang datar.','🔄',1),
('text','twist','Cliffhanger','berakhir menggantung bikin penasaran','ending on a suspenseful cliffhanger','Cliffhanger bikin pembaca mikir — teknik penulis serial profesional.','🪝',2),
('text','twist','Pesan Tersembunyi','ada pesan tersembunyi yang baru terasa di akhir','with a hidden message revealed at the end','Lapisan makna ganda menunjukkan AI bisa menulis lebih dari sekadar literal.','🔍',3),
('text','tantangan','Tema Rindu Rumah','temanya rindu kampung halaman','the theme is homesickness','Tema emosional menguji: bisa nggak AI (dan kamu) bikin pembaca terharu?','🏠',1),
('text','tantangan','Tokohnya Penjual Koshari','tokoh utamanya penjual koshari','the main character is a koshari seller','Tokoh spesifik lokal bikin cerita unik — nggak ada di internet manapun!','🍲',2),
('text','tantangan','Latar Musim Ujian','latarnya musim ujian di Al-Azhar','set during exam season at Al-Azhar','Latar yang relate bikin pembaca Masisir langsung senyum-senyum sendiri.','📝',3),

-- ═══ JALUR MUSIK ═══
('music','genre','Lo-fi Santai','musik lo-fi santai untuk belajar','chill lo-fi study music','Genre adalah instruksi terpenting untuk AI musik — tentukan dulu ini.','🎧',1),
('music','genre','Nasyid Modern','nasyid modern dengan sentuhan pop','modern nasheed with a pop touch','Menggabungkan dua genre menghasilkan sesuatu yang fresh dan tak terduga.','🕌',2),
('music','genre','Rap Semangat','rap dengan beat semangat','energetic rap with strong beats','AI musik seperti Suno paham struktur rap: verse, hook, flow.','🎤',3),
('music','tempo_mood','Pelan & Syahdu','tempo pelan, suasana syahdu','slow tempo, soulful mood','Tempo menentukan detak jantung lagu — pelan berarti emosional.','🐢',1),
('music','tempo_mood','Sedang & Hangat','tempo sedang, suasana hangat','medium tempo, warm mood','Tempo sedang paling aman untuk lagu yang mudah dinikmati semua orang.','☕',2),
('music','tempo_mood','Cepat & Membara','tempo cepat, penuh semangat','fast tempo, fiery and energetic','Tempo cepat cocok untuk lagu penyemangat — AI menambah drum lebih rapat.','🔥',3),
('music','tema','Perjuangan Masisir','tentang perjuangan mahasiswa di negeri orang','about students striving far from home','Tema lirik memberi AI bahan cerita — makin spesifik makin mengena.','💪',1),
('music','tema','Rindu Rumah','tentang kerinduan pada kampung halaman','about longing for home','Tema universal seperti rindu paling gampang bikin pendengar relate.','🏡',2),
('music','tema','Semangat Belajar','tentang semangat menuntut ilmu','about the spirit of seeking knowledge','Tema positif menghasilkan lirik yang bisa dipakai untuk konten motivasi.','📚',3),
('music','bahasa','Indonesia','lirik bahasa Indonesia','lyrics in Indonesian','Suno bisa berbahasa Indonesia — sebut eksplisit biar nggak default Inggris.','🇮🇩',1),
('music','bahasa','Campur Indo-Arab','lirik campuran Indonesia dan Arab','lyrics mixing Indonesian and Arabic','Campuran bahasa menghasilkan lagu yang unik khas Masisir!','🕋',2),
('music','bahasa','Inggris','lirik bahasa Inggris','lyrics in English','Lirik Inggris paling natural untuk AI musik — kosakata latihannya terbanyak.','🌐',3),
('music','tantangan','Ada Kata "Piramida"','liriknya wajib menyebut kata piramida','lyrics must mention the word pyramid','Tantangan lirik menguji kreativitas: gimana "piramida" masuk dengan mulus?','🔺',1),
('music','tantangan','Ada Suara Adzan/Bedug','harus ada nuansa suara adzan atau bedug','must include adhan or bedug drum nuances','Elemen audio lokal bikin lagu langsung terasa "rumah".','🥁',2),
('music','tantangan','Duet Dua Suara','harus ada dua karakter suara berbeda','must feature two different vocal characters','Suno bisa duet! Minta eksplisit dua suara — hasilnya lebih kaya.','👯',3),

-- ═══ JALUR MINI APP / KODE ═══
('code','jenis_tool','Konversi EGP-Rupiah','kalkulator konversi pound Mesir ke Rupiah','an EGP to Rupiah currency converter','Mulai dari masalah nyata sehari-hari — tools sederhana tapi langsung berguna.','💱',1),
('code','jenis_tool','Jadwal Murojaah','generator jadwal murojaah hafalan mingguan','a weekly Quran review schedule generator','AI jago bikin logika penjadwalan — kamu tinggal jelasin aturannya.','🗓️',2),
('code','jenis_tool','Split Bill Syakan','pembagi tagihan bulanan anak syakan (kosan)','a monthly bill splitter for shared housing','Masalah klasik anak kosan — sekali bikin, dipakai tiap bulan!','🏘️',3),
('code','pengguna','Mahasiswa Baru','untuk mahasiswa baru yang belum paham apa-apa','for confused new students','Menyebut target pengguna bikin AI menyederhanakan bahasa dan alur.','🐣',1),
('code','pengguna','Anak Syakan','untuk penghuni syakan yang berbagi pengeluaran','for shared-housing residents splitting costs','Konteks pengguna menentukan fitur apa yang penting dan yang bisa dibuang.','🛏️',2),
('code','pengguna','Panitia Event','untuk panitia acara yang serba buru-buru','for busy event organizers','Pengguna yang buru-buru = AI diminta bikin UI yang minim klik.','🏃',3),
('code','fitur','Simpan Otomatis','data tersimpan otomatis di perangkat','data auto-saves on the device','Sebut fitur penyimpanan eksplisit — kalau nggak, AI bikin app yang lupa segalanya.','💾',1),
('code','fitur','Bisa Di-share','hasilnya bisa dibagikan sebagai teks','results can be shared as text','Fitur share bikin tool-mu menyebar sendiri dari pengguna ke pengguna.','📤',2),
('code','fitur','Mode Gelap','ada tampilan mode gelap','includes dark mode','Fitur kecil yang disebut eksplisit menunjukkan kamu paham detail produk.','🌒',3),
('code','tampilan','Simpel Bersih','tampilan simpel dan bersih','a simple clean interface','Untuk tool sehari-hari, "simpel" mengalahkan "keren" — pengguna mau cepat.','🧼',1),
('code','tampilan','Tema Mesir','tampilan bertema Mesir kuno','ancient Egypt themed design','Tema visual bikin tool biasa jadi punya karakter — sebut warna/motifnya.','🏺',2),
('code','tampilan','Warna AIGYPT','tampilan dengan warna ungu khas AIGYPT','purple AIGYPT brand colors','Konsistensi warna brand — AI paham "purple theme" dan menerapkannya.','💜',3),
('code','tantangan','Tanpa Tombol','tidak boleh ada tombol sama sekali (semua otomatis)','no buttons allowed — everything automatic','Batasan aneh memaksa mikir UX kreatif: input berubah, hasil langsung update.','🚫',1),
('code','tantangan','Muat di Satu Layar','semua harus muat dalam satu layar tanpa scroll','everything must fit one screen, no scrolling','Batasan ruang melatih prioritas: fitur mana yang benar-benar penting?','📱',2),
('code','tantangan','Ada Easter Egg','harus ada kejutan tersembunyi (easter egg)','must include a hidden easter egg','Easter egg itu tradisi programmer — dan bikin orang mengeksplor tool-mu.','🥚',3)

on conflict (track, category, label) do nothing;

-- Selesai. Cek hasilnya:
-- select track, count(*) from prompt_blocks group by track;  -- masing-masing 15
