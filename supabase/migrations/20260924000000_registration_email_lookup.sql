begin;

-- A narrowly scoped lookup over Supabase's existing Auth users.
-- Only the server's secret-key client may execute it; no user data is returned.
create or replace function public.is_email_registered(email_to_check text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    where pg_catalog.lower(u.email) = pg_catalog.lower(pg_catalog.btrim(email_to_check))
  );
$$;

revoke all on function public.is_email_registered(text) from public, anon, authenticated;
grant execute on function public.is_email_registered(text) to service_role;

comment on function public.is_email_registered(text) is
  'Server-only registration preflight; includes confirmed and unconfirmed Auth accounts.';

commit;
