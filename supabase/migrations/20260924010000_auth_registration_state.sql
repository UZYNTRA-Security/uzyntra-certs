begin;
create or replace function public.registration_email_state(email_to_check text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select case when u.email_confirmed_at is null then 'unverified' else 'verified' end
    from auth.users u where pg_catalog.lower(u.email) = pg_catalog.lower(pg_catalog.btrim(email_to_check))
    order by u.email_confirmed_at nulls last limit 1), 'new');
$$;
revoke all on function public.registration_email_state(text) from public, anon, authenticated;
grant execute on function public.registration_email_state(text) to service_role;
commit;
