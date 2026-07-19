-- Baseline: the schema as it already exists in the hosted project, captured
-- from a catalog dump on 2026-07-17. It was built by hand in the dashboard with
-- no migration history, so this file is a faithful record of reality rather
-- than a change. Written idempotently: safe to run against the live database
-- (no-op) and enough to rebuild the schema from scratch.
--
-- Fixes and MVP changes go in later migrations, not here.

-- ---------------------------------------------------------------- helpers ---

create or replace function public.update_modified_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Creates the profiles row on signup, reading the metadata passed to signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, biometric_enabled)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    false
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------- tables ---

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  biometric_enabled boolean default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exam_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  order_index integer default 0,
  status text default 'not_started'
    check (status in ('not_started', 'in_progress', 'mastered')),
  pdf_url text,
  created_at timestamptz not null default timezone('utc', now()),
  -- Spaced repetition columns, unused so far.
  last_review_date date,
  next_review_date date,
  review_interval integer default 1,
  ease_factor real default 2.5
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null unique references public.topics(id) on delete cascade,
  content text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Never written to by the app. Superseded by a derived plan; dropped in 0002.
create table if not exists public.study_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  date date not null,
  type text default 'new' check (type in ('new', 'review')),
  completed boolean default false,
  created_at timestamptz not null default timezone('utc', now())
);

-- Never read or written by the app. Dropped in 0002.
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null,
  completed_topics integer default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- --------------------------------------------------------------- triggers ---

drop trigger if exists update_profiles_modtime on public.profiles;
create trigger update_profiles_modtime
  before update on public.profiles
  for each row execute function public.update_modified_column();

drop trigger if exists update_notes_modtime on public.notes;
create trigger update_notes_modtime
  before update on public.notes
  for each row execute function public.update_modified_column();

-- Lives on auth.users, so it is outside the public schema and did not appear in
-- the dump. Recreated here so a rebuilt database still populates profiles.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------- RLS ---
-- Every table: the owner may do everything, nobody else sees anything.
-- auth.uid() is null for anon, so the public role grants nothing to logged-out
-- callers. Verified correct against the live database.

alter table public.profiles        enable row level security;
alter table public.subjects        enable row level security;
alter table public.topics          enable row level security;
alter table public.notes           enable row level security;
alter table public.study_plan      enable row level security;
alter table public.study_sessions  enable row level security;

drop policy if exists "Users can fully manage their own profile" on public.profiles;
create policy "Users can fully manage their own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can fully manage their own subjects" on public.subjects;
create policy "Users can fully manage their own subjects" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can fully manage their own topics" on public.topics;
create policy "Users can fully manage their own topics" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can fully manage their own notes" on public.notes;
create policy "Users can fully manage their own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can fully manage their own study plan" on public.study_plan;
create policy "Users can fully manage their own study plan" on public.study_plan
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can fully manage their own study sessions" on public.study_sessions;
create policy "Users can fully manage their own study sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- storage ---

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;
