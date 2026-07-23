-- In-app account deletion, required by App Store guideline 5.1.1(v) and Google
-- Play. A SECURITY DEFINER function lets a signed-in user delete THEIR OWN
-- auth.users row; every public table references auth.users(id) ON DELETE
-- CASCADE, so their profile, subjects, topics, notes, study_log and materials
-- rows go with it. (Storage objects in the `materials` bucket are not removed by
-- the cascade — a periodic cleanup or a storage trigger can handle those later.)

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is the caller; a user can only ever delete themselves.
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call it; never anon or the public role.
revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
