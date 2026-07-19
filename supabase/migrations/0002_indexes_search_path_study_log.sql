-- Non-destructive hardening + the table the derived study plan needs.
-- Safe to run on the live database: adds only, drops nothing.

-- ------------------------------------------------- 1. search_path hardening ---
-- handle_new_user is SECURITY DEFINER, so it runs as its owner (postgres) with
-- the caller's search_path. Without a pinned search_path, an object resolved
-- unqualified could be hijacked by a schema earlier in that path — the case
-- Supabase's own linter flags as "Function Search Path Mutable". The body
-- already qualifies public.profiles, so pinning the path costs nothing.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
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

-- -------------------------------------------------------------- 2. indexes ---
-- Only the primary keys were indexed. Every RLS policy filters on user_id and
-- every list query filters on subject_id, so all of it was sequential scans.
-- Irrelevant at 60 topics, free to fix now, painful to notice later.

create index if not exists topics_subject_id_order_idx
  on public.topics (subject_id, order_index);
create index if not exists topics_user_id_idx    on public.topics (user_id);
create index if not exists subjects_user_id_idx  on public.subjects (user_id);
create index if not exists notes_user_id_idx     on public.notes (user_id);

-- ------------------------------------------------------------ 3. study_log ---
-- Records that a topic was studied on a given day. Replaces the study_plan
-- table: today's plan is derived from topics (first N unmastered by
-- order_index), and this only records what actually happened. It is also what
-- makes the streak on the Progress screen real instead of a hardcoded 0.

create table if not exists public.study_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  -- The client sends its own local date; a streak must break on the user's
  -- midnight, not UTC's. The default is only a fallback.
  studied_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default timezone('utc', now()),
  -- Makes "mark done" idempotent: re-marking the same topic the same day is a
  -- no-op rather than a duplicate row inflating the count.
  unique (topic_id, studied_on)
);

create index if not exists study_log_user_date_idx
  on public.study_log (user_id, studied_on desc);

alter table public.study_log enable row level security;

drop policy if exists "Users can fully manage their own study log" on public.study_log;
create policy "Users can fully manage their own study log" on public.study_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
