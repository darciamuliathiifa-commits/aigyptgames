-- AIGYPT Poster Challenge — Migration v3: Multi-Entry Support
-- Jalankan di Supabase SQL Editor setelah migration_v2.sql

-- ──────────────────────────────────────────────
-- 1. Add email to participants (nullable untuk backward compat peserta lama)
-- ──────────────────────────────────────────────
alter table participants add column if not exists email text;

-- Unique index case-insensitive, only for non-null emails
create unique index if not exists participants_email_unique
  on participants (lower(email))
  where email is not null;

-- ──────────────────────────────────────────────
-- 2. Create entries table
-- ──────────────────────────────────────────────
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) not null,
  entry_number int not null check (entry_number between 1 and 3),
  anomaly_card_id uuid references anomaly_cards(id) not null,
  created_at timestamptz default now(),
  unique (participant_id, entry_number)
);

-- ──────────────────────────────────────────────
-- 3. Add entry_id to submissions, drop old unique constraint on participant_id
-- ──────────────────────────────────────────────
alter table submissions add column if not exists entry_id uuid references entries(id);

-- Drop the old unique constraint that prevented one participant from having multiple submissions
alter table submissions drop constraint if exists submissions_participant_id_key;

-- ──────────────────────────────────────────────
-- 4. Data migration: create entry #1 for each existing participant
-- ──────────────────────────────────────────────
insert into entries (participant_id, entry_number, anomaly_card_id, created_at)
select
  p.id,
  1,
  p.anomaly_card_id,
  p.created_at
from participants p
where p.anomaly_card_id is not null
  and not exists (
    select 1 from entries e
    where e.participant_id = p.id and e.entry_number = 1
  );

-- ──────────────────────────────────────────────
-- 5. Link existing submissions to their entry #1
-- ──────────────────────────────────────────────
update submissions s
set entry_id = e.id
from entries e
where e.participant_id = s.participant_id
  and e.entry_number = 1
  and s.entry_id is null;

-- ──────────────────────────────────────────────
-- 6. RLS for entries
-- ──────────────────────────────────────────────
alter table entries enable row level security;

create policy "anon can read entries"
  on entries for select
  to anon
  using (true);

create policy "service role full access entries"
  on entries for all
  to service_role
  using (true)
  with check (true);
