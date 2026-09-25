select jsonb_build_object(
  'profile_columns', (select jsonb_agg(column_name order by ordinal_position)
    from information_schema.columns where table_schema = 'public' and table_name = 'profiles'
      and column_name in ('headline','country','portfolio_url','visibility','avatar_updated_at')),
  'avatar_bucket', (select jsonb_build_object('public', public, 'limit', file_size_limit, 'types', allowed_mime_types)
    from storage.buckets where id = 'avatars'),
  'storage_policies', (select jsonb_agg(policyname order by policyname)
    from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'avatars_%'),
  'profile_policies', (select jsonb_agg(policyname order by policyname)
    from pg_policies where schemaname = 'public' and tablename = 'profiles'),
  'public_profile_function', to_regprocedure('public.get_public_profile(text)') is not null,
  'anon_cannot_execute', not has_function_privilege('anon', 'public.get_public_profile(text)', 'execute'),
  'authenticated_cannot_execute', not has_function_privilege('authenticated', 'public.get_public_profile(text)', 'execute'),
  'service_can_execute', has_function_privilege('service_role', 'public.get_public_profile(text)', 'execute')
);
