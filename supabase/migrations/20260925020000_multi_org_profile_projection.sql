begin;

-- Preserve one universal candidate profile while attributing each public credential
-- to the organization that issued it. Organizations still control only their own
-- credential records; this projection exposes issuer attribution for candidate
-- profile grouping without exposing private organization data.
create or replace function public.get_public_profile(requested_username text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username',p.username,'full_name',p.full_name,'headline',p.headline,'bio',p.bio,'country',p.country,
    'linkedin_url',p.linkedin_url,'github_url',p.github_url,'portfolio_url',p.portfolio_url,
    'has_avatar',p.avatar_url is not null,'avatar_updated_at',p.avatar_updated_at,
    'credentials',coalesce((select jsonb_agg(jsonb_build_object(
      'credential_id',c.credential_id,'title',c.title,'credential_type',c.credential_type,
      'issue_date',c.issue_date,'expiry_date',c.expiry_date,'status',c.status,'public_visible',true,
      'issuer',o.name,
      'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,
        'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name)
        from public.credential_badges cb join public.badges b on b.id=cb.badge_id
        where cb.credential_id=c.id),'[]'::jsonb)
    ) order by o.name,c.issue_date desc,c.credential_id)
    from public.credentials c
    join public.organizations o on o.id=c.organization_id
    where c.owner_id=p.id and c.public_visible),'[]'::jsonb)
  ) from public.profiles p where p.username=requested_username and p.visibility='public';
$$;

revoke all on function public.get_public_profile(text) from public, anon, authenticated;
grant execute on function public.get_public_profile(text) to service_role;

commit;
