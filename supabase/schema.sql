-- ============================================================
-- Golf Charity Subscription Platform — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- CHARITIES
-- ────────────────────────────────────────────────────────────
create table charities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image_url text,
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  subscription_type text check (subscription_type in ('monthly', 'yearly')),
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'cancelled')),
  subscription_start timestamptz,
  subscription_end timestamptz,
  charity_id uuid references charities(id),
  charity_percentage integer default 10 check (charity_percentage >= 10 and charity_percentage <= 100),
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- SCORES
-- ────────────────────────────────────────────────────────────
create table scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  played_date date not null,
  created_at timestamptz default now()
);

-- Index for fast user score lookup
create index scores_user_id_idx on scores(user_id, played_date desc);

-- ────────────────────────────────────────────────────────────
-- DRAWS
-- ────────────────────────────────────────────────────────────
create table draws (
  id uuid primary key default uuid_generate_v4(),
  draw_numbers integer[] not null,          -- array of 5 numbers (1–45)
  month text not null,                      -- e.g. "2026-03"
  is_published boolean default false,
  jackpot_rollover boolean default false,
  total_prize_pool numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- WINNINGS
-- ────────────────────────────────────────────────────────────
create table winnings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  draw_id uuid not null references draws(id),
  match_type integer not null check (match_type in (3, 4, 5)),
  amount numeric(10,2) default 0,
  status text default 'pending' check (status in ('pending', 'verified', 'paid', 'rejected')),
  proof_url text,
  created_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table users enable row level security;
alter table scores enable row level security;
alter table charities enable row level security;
alter table draws enable row level security;
alter table winnings enable row level security;

-- Users: can read/update own row; admins can read all
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

create policy "Admin full access to users" on users
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Scores: users manage own scores
create policy "Users manage own scores" on scores
  for all using (auth.uid() = user_id);

create policy "Admin can view all scores" on scores
  for select using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Charities: public read, admin write
create policy "Public can read charities" on charities
  for select using (true);

create policy "Admin manages charities" on charities
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Draws: published draws are public; admin manages all
create policy "Public can view published draws" on draws
  for select using (is_published = true);

create policy "Admin manages draws" on draws
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Winnings: users see own winnings
create policy "Users view own winnings" on winnings
  for select using (auth.uid() = user_id);

create policy "Admin manages winnings" on winnings
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- ────────────────────────────────────────────────────────────
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- SEED: Default charities
-- ────────────────────────────────────────────────────────────
insert into charities (name, description, is_featured) values
  ('Woodland Trust', 'Protecting and restoring ancient woodland across the UK.', true),
  ('Mind UK', 'Mental health support and advocacy for everyone.', false),
  ('Macmillan Cancer Support', 'Support for people living with cancer.', false),
  ('RNLI', 'Saving lives at sea since 1824.', false);
