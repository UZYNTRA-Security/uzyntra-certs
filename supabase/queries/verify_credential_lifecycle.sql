select jsonb_build_object(
  'migration_tables', (select jsonb_agg(table_name order by table_name) from information_schema.tables where table_schema='public' and table_name in ('credentials','credential_events','credential_issuers')),
  'statuses', (select jsonb_agg(enumlabel order by enumsortorder) from pg_enum join pg_type on pg_type.oid=enumtypid where typname='credential_status'),
  'issuer_roles', (select jsonb_agg(enumlabel order by enumsortorder) from pg_enum join pg_type on pg_type.oid=enumtypid where typname='issuer_role'),
  'badge_bucket', (select jsonb_build_object('public',public,'limit',file_size_limit,'types',allowed_mime_types) from storage.buckets where id='badge-artwork'),
  'lifecycle_policies', (select count(*) from pg_policies where schemaname='public' and policyname in ('credentials_issuer_read','credentials_issuer_create','credentials_issuer_update','credential_events_issuer_read','issuers_own_read')),
  'event_immutable_trigger', exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='credential_events' and trigger_name='credential_events_immutable'),
  'issuer_memberships', (select count(*) from public.credential_issuers),
  'credential_count', (select count(*) from public.credentials)
);
