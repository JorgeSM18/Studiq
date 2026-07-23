-- Study materials as first-class rows instead of a single topics.pdf_url column:
-- a topic can hold several files, and a file can sit unassigned in the library
-- (topic_id null). One file belongs to at most one topic.
--
-- Safe to run once on the live database. Backfills existing pdf_url values.

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- set null (not cascade): deleting a topic returns its files to the library
  -- rather than destroying them.
  topic_id uuid references public.topics(id) on delete set null,
  name text not null,
  path text not null,
  mime_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists materials_user_idx on public.materials (user_id);
create index if not exists materials_topic_idx on public.materials (topic_id);

alter table public.materials enable row level security;

drop policy if exists "Users can fully manage their own materials" on public.materials;
create policy "Users can fully manage their own materials" on public.materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Backfill: lift each existing attachment into its own material row. The stored
-- path stays valid (storage RLS only checks the first path segment == uid).
insert into public.materials (user_id, topic_id, name, path)
select user_id, id, split_part(pdf_url, '/', array_length(string_to_array(pdf_url, '/'), 1)), pdf_url
from public.topics
where pdf_url is not null
  and not exists (
    select 1 from public.materials m where m.path = public.topics.pdf_url
  );

-- pdf_url is now superseded by the materials table. Left in place (harmless) so
-- this migration stays non-destructive; drop it in a later optional migration
-- once you've confirmed the backfill.
