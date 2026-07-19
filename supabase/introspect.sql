-- Dumps the current schema as a single JSON cell.
--
-- Paste into Supabase > SQL Editor and run. It must stay ONE statement: the
-- editor only renders the result of the last statement, so a script of separate
-- queries silently discards everything but the final block.
--
-- Copy the resulting cell (or use Download CSV if the cell is awkward to select)
-- and send it back. Read-only: this only queries the catalog, it changes nothing.

select jsonb_pretty(jsonb_build_object(

  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name, 'column', column_name, 'type', data_type,
      'nullable', is_nullable, 'default', column_default
    ) order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public'
  ),

  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', rel.relname, 'name', con.conname,
      'definition', pg_get_constraintdef(con.oid)
    ) order by rel.relname, con.conname), '[]'::jsonb)
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relnamespace = 'public'::regnamespace
  ),

  'indexes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', indexname, 'definition', indexdef
    ) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes
    where schemaname = 'public'
  ),

  -- The two blocks that matter most: every write in the app filters by id alone
  -- and trusts RLS for user isolation.
  'rls_enabled', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', relname, 'enabled', relrowsecurity, 'forced', relforcerowsecurity
    ) order by relname), '[]'::jsonb)
    from pg_class
    where relnamespace = 'public'::regnamespace and relkind = 'r'
  ),

  'rls_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'permissive', permissive,
      'roles', roles::text, 'command', cmd,
      'using', qual, 'with_check', with_check
    ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'public'
  ),

  'triggers', (
    select coalesce(jsonb_agg(distinct jsonb_build_object(
      'table', event_object_table, 'name', trigger_name,
      'timing', action_timing, 'event', event_manipulation,
      'statement', action_statement
    )), '[]'::jsonb)
    from information_schema.triggers
    where trigger_schema = 'public'
  ),

  -- Functions backing those triggers (e.g. a handle_new_user hook), which is
  -- where a security definer search_path bug would hide.
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname, 'security_definer', p.prosecdef,
      'definition', pg_get_functiondef(p.oid)
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
  ),

  'storage_buckets', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'public', public
    ) order by id), '[]'::jsonb)
    from storage.buckets
  ),

  'storage_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', policyname, 'command', cmd, 'using', qual, 'with_check', with_check
    ) order by policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'storage'
  )

)) as schema_dump;
