-- Apply only to the dedicated UZYNTRA Certs project.
-- No business tables, identities, credentials, buckets, or sample data.
begin;

revoke create on schema public from public;
revoke create on schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase migrations run as postgres. Future application migrations must opt
-- in to the exact grants they require and enable RLS before granting access.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
