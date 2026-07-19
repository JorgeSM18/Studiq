-- OPTIONAL AND DESTRUCTIVE. Kept separate from 0002 so it is never run by
-- accident. Nothing else depends on it: the app works with or without this.
--
-- Run it only after confirming these tables are empty:
--
--   select 'study_plan' as t, count(*) from public.study_plan
--   union all
--   select 'study_sessions', count(*) from public.study_sessions;
--
-- Both are dead: no code path in the app has ever written to either one, and
-- study_plan is superseded by the derived plan plus study_log (see 0002).
-- If either returns a non-zero count, stop and say so — the assumption that
-- nothing writes to them would be wrong, and that is worth understanding
-- before dropping anything.

drop table if exists public.study_plan;
drop table if exists public.study_sessions;

-- Left behind by the biometric login that was removed from the client (it
-- stored the user's password, which is why it went). Nothing reads this column.
-- If biometrics return, the flag belongs in device-local storage anyway, not in
-- a synced profile: "unlock with Face ID" is a per-device choice.
--
-- handle_new_user inserts into this column, so it must be redefined in the same
-- transaction as the drop. Dropping the column alone would leave the trigger
-- inserting into a column that no longer exists, and every new signup would
-- fail on the auth.users insert.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

alter table public.profiles drop column if exists biometric_enabled;

commit;
