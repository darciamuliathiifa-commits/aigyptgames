-- Migration v2: Example Posters
-- Jalankan di Supabase SQL Editor setelah migration.sql

create table example_posters (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- RLS
alter table example_posters enable row level security;

-- Anon hanya bisa lihat yang active = true
create policy "anon can read active example_posters"
  on example_posters for select
  to anon
  using (active = true);

-- Service role bisa semua (insert/update/delete via backend)
create policy "service role full access example_posters"
  on example_posters for all
  to service_role
  using (true)
  with check (true);
