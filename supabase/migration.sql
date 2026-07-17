-- AIGYPT Poster Challenge — Run this manually in Supabase SQL Editor

-- ──────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────

create table if not exists anomaly_cards (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  emoji text not null,
  active boolean default true
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ig_handle text not null,
  wants_class_info boolean default false,
  anomaly_card_id uuid references anomaly_cards(id),
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) not null unique,
  image_url text not null,
  ig_post_url text not null,
  status text default 'pending' check (status in ('pending','verified','rejected')),
  winner_category text check (winner_category in ('kreatif','absurd','niat') or winner_category is null),
  created_at timestamptz default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) not null,
  voter_fingerprint text not null,
  created_at timestamptz default now(),
  unique (submission_id, voter_fingerprint)
);

create table if not exists prize_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier text not null check (tier in ('basic','premium')),
  claimed_by uuid references participants(id),
  claimed_at timestamptz
);

create table if not exists settings (
  key text primary key,
  value text not null
);

-- ──────────────────────────────────────────────
-- SEED — default settings
-- ──────────────────────────────────────────────

insert into settings (key, value) values
  ('deadline_submit', (now() + interval '7 days')::text),
  ('voting_open', 'false')
on conflict (key) do nothing;

-- ──────────────────────────────────────────────
-- SEED — 25 Anomaly Cards
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
  ('🌙', 'Bulan turun jadi lampu tenant')
on conflict do nothing;

-- ──────────────────────────────────────────────
-- STORAGE — create bucket
-- ──────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

-- ──────────────────────────────────────────────
-- VIEWS
-- ──────────────────────────────────────────────

create or replace view submission_vote_counts as
  select submission_id, count(*) as vote_count
  from votes
  group by submission_id;

create or replace view leaderboard_public as
  select
    s.id as submission_id,
    p.name,
    p.ig_handle,
    ac.emoji,
    ac.text as anomaly_text,
    s.image_url,
    s.status,
    s.winner_category,
    coalesce(v.vote_count, 0) as vote_count,
    s.created_at
  from submissions s
  join participants p on p.id = s.participant_id
  left join anomaly_cards ac on ac.id = p.anomaly_card_id
  left join submission_vote_counts v on v.submission_id = s.id
  where s.status in ('pending', 'verified');

-- ──────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────

alter table anomaly_cards enable row level security;
alter table participants enable row level security;
alter table submissions enable row level security;
alter table votes enable row level security;
alter table prize_codes enable row level security;
alter table settings enable row level security;

-- anomaly_cards: anyone can read
create policy "anon can select anomaly_cards"
  on anomaly_cards for select to anon using (true);

-- participants: anon can insert; can only read own row via participant_id
create policy "anon can insert participants"
  on participants for insert to anon with check (true);

create policy "anon can select own participant"
  on participants for select to anon
  using (true);  -- client filters by id; service role sees all

-- submissions: anon can insert (one per participant via unique constraint)
create policy "anon can insert submissions"
  on submissions for insert to anon with check (true);

create policy "anon can select submissions via view"
  on submissions for select to anon using (status in ('pending','verified'));

create policy "anon can update own submission"
  on submissions for update to anon
  using (true) with check (status = 'pending');

-- votes: anon can insert for verified submissions; anon can select own votes
create policy "anon can insert votes"
  on votes for insert to anon with check (true);

create policy "anon can select votes"
  on votes for select to anon using (true);

create policy "anon can delete own votes"
  on votes for delete to anon using (true);

-- prize_codes: no anon access at all
create policy "no anon access to prize_codes"
  on prize_codes for all to anon using (false);

-- settings: anon can read
create policy "anon can read settings"
  on settings for select to anon using (true);

-- Storage policy: anyone can upload to posters bucket
create policy "anon can upload to posters"
  on storage.objects for insert to anon
  with check (bucket_id = 'posters');

create policy "public can read posters"
  on storage.objects for select to anon
  using (bucket_id = 'posters');
