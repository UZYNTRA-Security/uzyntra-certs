begin;

alter type public.credential_status add value if not exists 'DRAFT';
alter type public.credential_status add value if not exists 'PENDING_REVIEW';
alter type public.credential_status add value if not exists 'ISSUED';
commit;

begin;
create type public.issuer_role as enum ('ISSUER','REVIEWER','ADMIN');
create type public.credential_category as enum ('COURSE','INTERNSHIP','EMPLOYMENT','CONTRIBUTION','APPRECIATION','BUG_BOUNTY','ACHIEVEMENT');

create table public.credential_issuers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  issuer_name text not null default 'UZYNTRA Security' check (length(issuer_name) between 1 and 160),
  role public.issuer_role not null default 'ISSUER',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger credential_issuers_touch before update on public.credential_issuers for each row execute function public.touch_updated_at();

alter table public.credentials add column category public.credential_category;
update public.credentials set category = case credential_type
  when 'COURSE_CERTIFICATE' then 'COURSE'::public.credential_category
  when 'INTERNSHIP' then 'INTERNSHIP'::public.credential_category
  when 'EMPLOYMENT' then 'EMPLOYMENT'::public.credential_category
  when 'CONTRIBUTION' then 'CONTRIBUTION'::public.credential_category
  when 'APPRECIATION' then 'APPRECIATION'::public.credential_category
  when 'BUG_BOUNTY' then 'BUG_BOUNTY'::public.credential_category
  else 'ACHIEVEMENT'::public.credential_category end;
alter table public.credentials alter column category set not null;
alter table public.credentials add column issuer_id uuid references public.credential_issuers(id) on delete restrict;
alter table public.credentials add column issued_at timestamptz;
alter table public.credentials add column revoked_at timestamptz;
alter table public.credentials add column revocation_reason text check (length(revocation_reason) between 8 and 1000);
alter table public.credentials alter column status drop default;
update public.credentials set status = case when status = 'ACTIVE' then 'ISSUED'::public.credential_status when status = 'SUSPENDED' then 'REVOKED'::public.credential_status else status end,
  issued_at = case when status in ('ACTIVE','EXPIRED','REVOKED','SUSPENDED') then created_at else null end;
alter table public.credentials alter column status set default 'DRAFT';
alter table public.credentials add constraint credentials_lifecycle_check check (
  (status in ('DRAFT','PENDING_REVIEW') and not public_visible and issued_at is null and revoked_at is null)
  or (status in ('ISSUED','EXPIRED') and public_visible and public_holder_name is not null and issued_at is not null and revoked_at is null)
  or (status = 'REVOKED' and public_visible and public_holder_name is not null and issued_at is not null and revoked_at is not null and revocation_reason is not null)
);

create table public.credential_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('CREATED','SUBMITTED','ISSUED','REVOKED','EXPIRED','BADGE_ASSIGNED','BADGE_REMOVED')),
  from_status public.credential_status,
  to_status public.credential_status,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.badges drop constraint badges_icon_url_check;
alter table public.badges add constraint badges_icon_url_check check (
  icon_url ~ '^/badges/[a-zA-Z0-9_-]+\.(png|svg|webp|jpg|jpeg)$' or icon_url ~ '^/api/badge/[a-f0-9-]{36}$'
);
create index credential_events_credential_time_idx on public.credential_events(credential_id, created_at desc);
create index credentials_issuer_idx on public.credentials(issuer_id, created_at desc);

create function public.is_active_issuer(allowed_roles public.issuer_role[] default array['ISSUER','REVIEWER','ADMIN']::public.issuer_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.credential_issuers ci where ci.user_id = (select auth.uid()) and ci.active and ci.role = any(allowed_roles));
$$;
revoke all on function public.is_active_issuer(public.issuer_role[]) from public, anon;
grant execute on function public.is_active_issuer(public.issuer_role[]) to authenticated, service_role;

alter table public.credential_issuers enable row level security;
alter table public.credential_events enable row level security;
revoke all on public.credential_issuers, public.credential_events from public, anon, authenticated;
grant select on public.credential_issuers, public.credential_events to authenticated;
grant select,insert,update on public.credentials to authenticated;
grant insert,delete on public.credential_badges to authenticated;
grant all on public.credential_issuers, public.credential_events to service_role;

drop policy credentials_own_read on public.credentials;
create policy credentials_own_read on public.credentials for select to authenticated using ((select auth.uid())=owner_id and status in ('ISSUED','REVOKED','EXPIRED'));

create policy issuers_own_read on public.credential_issuers for select to authenticated using (user_id = (select auth.uid()));
create policy credentials_issuer_read on public.credentials for select to authenticated using (public.is_active_issuer() and issuer_id is not null);
create policy credentials_issuer_create on public.credentials for insert to authenticated with check (
  public.is_active_issuer() and issuer_id=(select id from public.credential_issuers where user_id=(select auth.uid()) and active)
  and status='DRAFT' and not public_visible and issued_at is null and revoked_at is null
);
create policy credentials_issuer_update on public.credentials for update to authenticated using (public.is_active_issuer() and issuer_id is not null)
with check (public.is_active_issuer() and issuer_id is not null);
create policy credential_events_issuer_read on public.credential_events for select to authenticated using (
  public.is_active_issuer() and exists(select 1 from public.credentials c where c.id=credential_events.credential_id and c.issuer_id is not null)
);
create policy credential_badges_issuer_manage on public.credential_badges for all to authenticated using (
  public.is_active_issuer() and exists(select 1 from public.credentials c where c.id=credential_badges.credential_id and c.issuer_id is not null)
) with check (
  public.is_active_issuer() and exists(select 1 from public.credentials c where c.id=credential_badges.credential_id and c.issuer_id is not null)
);

create function public.enforce_credential_transition() returns trigger language plpgsql set search_path='' as $$
declare actor_role public.issuer_role;
begin
  if current_user <> 'authenticated' then return new; end if;
  select ci.role into actor_role from public.credential_issuers ci where ci.user_id=(select auth.uid()) and ci.active;
  if actor_role is null then raise exception 'Issuer access required'; end if;
  if new.id<>old.id or new.credential_id<>old.credential_id or new.owner_id<>old.owner_id or new.issuer_id is distinct from old.issuer_id or new.created_at<>old.created_at then raise exception 'Immutable credential field'; end if;
  if actor_role='ISSUER' and not (old.status='DRAFT' and new.status in ('DRAFT','PENDING_REVIEW')) then raise exception 'Reviewer access required'; end if;
  if old.status in ('ISSUED','REVOKED','EXPIRED') and actor_role<>'ADMIN' and not (old.status='ISSUED' and new.status='REVOKED') then raise exception 'Issued credentials are immutable'; end if;
  return new;
end;
$$;
revoke all on function public.enforce_credential_transition() from public,anon,authenticated;
create trigger credentials_transition before update on public.credentials for each row execute function public.enforce_credential_transition();

create function public.prevent_credential_event_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Credential audit events are immutable'; end;
$$;
revoke all on function public.prevent_credential_event_mutation() from public,anon,authenticated;
create trigger credential_events_immutable before update or delete on public.credential_events for each row execute function public.prevent_credential_event_mutation();

-- Candidate discovery reveals one minimal record only to the trusted application server.
create function public.find_candidate_for_issuance(candidate_email text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',u.email)
  from auth.users u join public.profiles p on p.id=u.id
  where lower(u.email)=lower(btrim(candidate_email)) and u.email_confirmed_at is not null limit 1;
$$;
revoke all on function public.find_candidate_for_issuance(text) from public, anon, authenticated;
grant execute on function public.find_candidate_for_issuance(text) to service_role;

-- Replace the Phase 3 projection with lifecycle, issuer, avatar and verification-time data.
create or replace function public.verify_public_credential(requested_id text, requester_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare attempts_now integer; found_credential public.credentials%rowtype; result jsonb; effective_status text; issuer_name text; profile_name text; profile_username text; profile_has_avatar boolean;
begin
  if requested_id !~ '^UZY-[A-Z0-9]{2,16}-[0-9]{4}-[A-Z0-9]{5,64}$' or requester_hash !~ '^[a-f0-9]{64}$' or requester_hash is null or requested_id is null then return jsonb_build_object('outcome','not_found'); end if;
  insert into public.verification_rate_limits as limits(requester_hash,window_start,attempts) values(requester_hash,now(),1)
  on conflict on constraint verification_rate_limits_pkey do update set attempts=case when limits.window_start<=now()-interval '1 minute' then 1 else limits.attempts+1 end,window_start=case when limits.window_start<=now()-interval '1 minute' then now() else limits.window_start end returning attempts into attempts_now;
  if attempts_now>30 then return jsonb_build_object('outcome','rate_limited'); end if;
  select * into found_credential from public.credentials c where c.credential_id=requested_id and c.public_visible and c.status in ('ISSUED','REVOKED','EXPIRED');
  if found_credential.id is null then insert into public.verification_logs(credential_id,outcome) values(null,'not_found'); return jsonb_build_object('outcome','not_found'); end if;
  effective_status:=case when found_credential.status='ISSUED' and found_credential.expiry_date<current_date then 'EXPIRED' else found_credential.status::text end;
  select coalesce(ci.issuer_name,'UZYNTRA Security') into issuer_name from public.credential_issuers ci where ci.id=found_credential.issuer_id;
  issuer_name:=coalesce(issuer_name,'UZYNTRA Security');
  select p.full_name,p.username,(p.avatar_url is not null) into profile_name,profile_username,profile_has_avatar from public.profiles p where p.id=found_credential.owner_id and p.visibility='public';
  result:=jsonb_build_object('outcome','found','credential',jsonb_build_object(
    'credential_id',found_credential.credential_id,'title',found_credential.title,'description',found_credential.description,'credential_type',found_credential.credential_type,'category',found_credential.category,
    'holder_name',found_credential.public_holder_name,'issuer',issuer_name,'issue_date',found_credential.issue_date,'expiry_date',found_credential.expiry_date,'status',effective_status,
    'profile_username',profile_username,'has_avatar',coalesce(profile_has_avatar,false),'verified_at',now(),
    'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name) from public.credential_badges cb join public.badges b on b.id=cb.badge_id where cb.credential_id=found_credential.id),'[]'::jsonb)
  ));
  insert into public.verification_logs(credential_id,outcome) values(found_credential.id,'found'); return result;
end;
$$;

-- Badge artwork is server-validated before this private object is published by application route.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('badge-artwork','badge-artwork',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy badge_artwork_issuer_read on storage.objects for select to authenticated using (
  bucket_id='badge-artwork' and public.is_active_issuer()
);
create policy badge_artwork_issuer_upload on storage.objects for insert to authenticated with check (
  bucket_id='badge-artwork' and public.is_active_issuer() and name ~ ('^' || (select auth.uid())::text || '/draft-[a-f0-9-]+\.(webp|jpg|png)$')
);
create policy badge_artwork_issuer_delete on storage.objects for delete to authenticated using (
  bucket_id='badge-artwork' and public.is_active_issuer() and split_part(name,'/',1)=(select auth.uid())::text
);

commit;
