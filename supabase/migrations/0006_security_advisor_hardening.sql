-- Closes the two real findings from Supabase's Security Advisor (linter) after
-- a public-repo audit. Non-destructive: hardens two functions, nothing dropped.
--
-- The advisor's other 3 findings are not addressed here on purpose:
--   - delete_current_user() "callable by signed-in users" is the intended
--     design (any authenticated user must be able to delete their own account).
--   - "Leaked Password Protection Disabled" requires the Pro plan; not
--     available to fix on this project's tier.

-- ------------------------------------------------- 1. search_path hardening ---
-- update_modified_column was missed when handle_new_user got this same fix in
-- migration 0002. It only calls now() (always resolves via pg_catalog), so
-- pinning the path is free.

create or replace function public.update_modified_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------- 2. handle_new_user grants ---
-- handle_new_user is a trigger function: it reads NEW, which only exists inside
-- a trigger context, so it cannot do anything useful called directly. Postgres
-- doesn't check EXECUTE for a trigger firing during a DML statement, so
-- revoking it here does not stop new signups from getting a profiles row — it
-- only removes the SECURITY DEFINER function from being callable by anyone
-- (anon, authenticated, or the public role) via a direct RPC call, which is
-- what the advisor flags as "Public/Signed-In Users Can Execute SECURITY
-- DEFINER Function".

revoke execute on function public.handle_new_user() from public, anon, authenticated;
