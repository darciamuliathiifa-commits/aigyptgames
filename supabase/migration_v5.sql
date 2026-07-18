-- AIGYPT Poster Challenge — Migration v5: Anomaly Cards Cleanup + Top-up
-- Jalankan di Supabase SQL Editor setelah migration_v4.sql
--
-- Kenapa perlu ini:
--   Seed di production.sql pakai "ON CONFLICT DO NOTHING" buat cegah kartu
--   anomali dobel, TAPI tabel anomaly_cards nggak punya unique constraint
--   apa-apa selain primary key `id` (yang selalu baru tiap insert). Jadi
--   ON CONFLICT itu sebenernya nggak pernah ke-trigger — kalau seed-nya
--   sempat kejalanin lebih dari sekali di database lo, kartunya bisa dobel
--   tanpa kelihatan. Migration ini beresin itu SEKALIGUS nambahin kartu
--   baru sampai totalnya 27 pilihan unik (udah lebih dari cukup dari
--   permintaan minimal 15+).

-- ──────────────────────────────────────────────
-- 1. Bersihkan duplikat yang mungkin udah kejadian (kalau ada). Untuk tiap
--    teks anomali yang sama, kartu paling lama (id terkecil) dipertahankan,
--    peserta/entry yang nempel ke kartu duplikat dipindah ke kartu yang
--    dipertahankan itu, baru duplikatnya dihapus.
-- ──────────────────────────────────────────────
with ranked as (
  select
    id,
    text,
    row_number() over (partition by text order by id) as rn,
    first_value(id) over (partition by text order by id) as keeper_id
  from anomaly_cards
),
dupes as (
  select id, keeper_id from ranked where rn > 1
)
update participants p
set anomaly_card_id = d.keeper_id
from dupes d
where p.anomaly_card_id = d.id;

with ranked as (
  select
    id,
    text,
    row_number() over (partition by text order by id) as rn,
    first_value(id) over (partition by text order by id) as keeper_id
  from anomaly_cards
),
dupes as (
  select id, keeper_id from ranked where rn > 1
)
update entries e
set anomaly_card_id = d.keeper_id
from dupes d
where e.anomaly_card_id = d.id;

with ranked as (
  select
    id,
    text,
    row_number() over (partition by text order by id) as rn
  from anomaly_cards
)
delete from anomaly_cards a
using ranked r
where a.id = r.id and r.rn > 1;

-- ──────────────────────────────────────────────
-- 2. Tambah unique constraint biar ON CONFLICT beneran jalan ke depannya
--    (seed ini dan seed manual lain lewat admin panel jadi aman diulang).
-- ──────────────────────────────────────────────
alter table anomaly_cards
  add constraint anomaly_cards_text_unique unique (text);

-- ──────────────────────────────────────────────
-- 3. Top-up ke 27 kartu kanonis (aman diulang berkali-kali sekarang).
-- ──────────────────────────────────────────────
insert into anomaly_cards (emoji, text) values
  ('🐪', 'Unta pakai VR headset nongkrong di depan tenant'),
  ('🦁', 'Sphinx lagi ngoding pakai laptop di dalam tenant'),
  ('🔺', 'Piramida melayang terbalik di atas tenant'),
  ('🤖', 'Robot AIGYPT jualan koshari'),
  ('👽', 'Alien antri daftar kelas AI'),
  ('🐫', 'Karavan unta robot lewat depan tenant'),
  ('🧞', 'Jin keluar dari lampu ajaib bawa laptop'),
  ('🛸', 'UFO nge-charge di colokan tenant'),
  ('🦅', 'Burung Horus jadi drone kamera'),
  ('🏜️', 'Tenant berdiri di tengah badai pasir neon'),
  ('🌊', 'Sungai Nil mengalir dari dalam tenant'),
  ('👑', 'Firaun selfie di photobooth AIGYPT'),
  ('🐈', 'Kucing raksasa Mesir tidur di atap tenant'),
  ('🚀', 'Tenant lepas landas jadi roket'),
  ('🕌', 'Tenant di atas awan di antara menara Kairo'),
  ('🧟', 'Mumi bangkit ikutan kelas Vibe Coding'),
  ('⚡', 'Petir ungu menyambar logo AIGYPT'),
  ('🎮', 'Tenant jadi arena game retro raksasa'),
  ('🐙', 'Gurita mekanik megang 8 laptop sekaligus'),
  ('🪞', 'Tenant di dunia cermin terbalik'),
  ('🌌', 'Portal galaksi terbuka di pintu tenant'),
  ('🦖', 'T-Rex pakai jaket AIGYPT jadi satpam'),
  ('🎈', 'Tenant terbang diangkat ribuan balon ungu'),
  ('🧊', 'Tenant membeku jadi es di tengah gurun'),
  ('🌙', 'Bulan turun jadi lampu tenant'),
  ('🐍', 'Ular kobra raksasa melilit tiang tenant, matanya laser ungu'),
  ('🦂', 'Kalajengking mekanik jaga pintu masuk tenant')
on conflict (text) do nothing;

-- Selesai. Cek hasilnya:
-- select count(*) from anomaly_cards;              -- harusnya 27
-- select count(*) from anomaly_cards where active;  -- yang keundi ke peserta baru
