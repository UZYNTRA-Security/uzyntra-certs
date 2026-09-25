begin;

alter table public.profiles
  add column headline text check (length(headline) <= 160),
  add column country text check (length(country) <= 100),
  add column portfolio_url text check (portfolio_url ~ '^https://' and length(portfolio_url) <= 2048),
  add column visibility text not null default 'private' check (visibility in ('public','private')),
  add column avatar_updated_at timestamptz;
update public.profiles set portfolio_url = website_url;
-- Existing external avatar URLs have not passed image validation. Keep no unapproved images.
update public.profiles set avatar_url = null;
alter table public.profiles drop constraint profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url = id::text || '/profile-image.webp');
alter table public.profiles add constraint profiles_public_complete
  check (visibility = 'private' or (username is not null and length(btrim(full_name)) > 0));
revoke update(avatar_url) on public.profiles from authenticated;
grant update(headline, country, portfolio_url, visibility) on public.profiles to authenticated;

-- A deliberately narrow public projection: no Auth IDs, email, storage paths or private credentials.
create function public.get_public_profile(requested_username text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username',p.username,'full_name',p.full_name,'headline',p.headline,'bio',p.bio,'country',p.country,
    'linkedin_url',p.linkedin_url,'github_url',p.github_url,'portfolio_url',p.portfolio_url,
    'has_avatar',p.avatar_url is not null,'avatar_updated_at',p.avatar_updated_at,
    'credentials',coalesce((select jsonb_agg(jsonb_build_object(
      'credential_id',c.credential_id,'title',c.title,'credential_type',c.credential_type,
      'issue_date',c.issue_date,'expiry_date',c.expiry_date,'status',c.status,'public_visible',true,
      'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,
        'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name)
        from public.credential_badges cb join public.badges b on b.id=cb.badge_id
        where cb.credential_id=c.id),'[]'::jsonb)
    ) order by c.issue_date desc,c.credential_id) from public.credentials c
      where c.owner_id=p.id and c.public_visible),'[]'::jsonb)
  ) from public.profiles p where p.username=requested_username and p.visibility='public';
$$;
revoke all on function public.get_public_profile(text) from public, anon, authenticated;
grant execute on function public.get_public_profile(text) to service_role;

-- Private bucket: approved public avatars are served by an uncached application route.
-- Draft uploads can never be read anonymously or overwrite a validated canonical image.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy avatars_owner_read on storage.objects for select to authenticated
using (bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
create policy avatars_owner_upload on storage.objects for insert to authenticated
with check (bucket_id='avatars' and name ~ ('^' || (select auth.uid())::text || '/draft-[a-f0-9-]+\.(webp|jpg|png)$'));
create policy avatars_owner_update on storage.objects for update to authenticated
using (bucket_id='avatars' and name ~ ('^' || (select auth.uid())::text || '/draft-[a-f0-9-]+\.(webp|jpg|png)$'))
with check (bucket_id='avatars' and name ~ ('^' || (select auth.uid())::text || '/draft-[a-f0-9-]+\.(webp|jpg|png)$'));
create policy avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);

commit;
