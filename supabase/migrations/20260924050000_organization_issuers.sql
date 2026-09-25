begin;

create type public.organization_type as enum ('SECURITY_COMPANY','UNIVERSITY','TRAINING_PROVIDER','CORPORATE','COMMUNITY');
create type public.organization_verified_status as enum ('PENDING','VERIFIED','SUSPENDED');
create type public.organization_member_role as enum ('ADMIN','REVIEWER','ISSUER','VIEWER');
create type public.organization_member_status as enum ('INVITED','ACTIVE','SUSPENDED');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 160),
  slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text check(logo_url ~ '^/(brand|api/organization-logo)/' and length(logo_url)<=2048),
  description text check(length(description)<=2000),
  website text check(website ~ '^https://' and length(website)<=2048),
  organization_type public.organization_type not null,
  verified_status public.organization_verified_status not null default 'PENDING',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
insert into public.organizations(id,name,slug,logo_url,description,website,organization_type,verified_status)
values('00000000-0000-4000-8000-000000000001','UZYNTRA Security','uzyntra-security','/brand/uzyntra-certs-logo.svg','Cybersecurity education, research and professional recognition.','https://uzyntra.com','SECURITY_COMPANY','VERIFIED');

create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict, role public.organization_member_role not null,
  status public.organization_member_status not null default 'ACTIVE', created_at timestamptz not null default now(),
  unique(organization_id,user_id)
);
create index organization_members_user_idx on public.organization_members(user_id,organization_id);

insert into public.organization_members(organization_id,user_id,role,status)
select '00000000-0000-4000-8000-000000000001',ci.user_id,ci.role::text::public.organization_member_role,'ACTIVE'
from public.credential_issuers ci where ci.active on conflict(organization_id,user_id) do nothing;

alter table public.credentials add column organization_id uuid references public.organizations(id) on delete restrict;
alter table public.credentials add column issuer_user_id uuid references auth.users(id) on delete restrict;
alter table public.credentials add column approved_by uuid references auth.users(id) on delete restrict;
update public.credentials c set organization_id='00000000-0000-4000-8000-000000000001',issuer_user_id=ci.user_id
from public.credential_issuers ci where ci.id=c.issuer_id;
update public.credentials set organization_id='00000000-0000-4000-8000-000000000001' where organization_id is null;
alter table public.credentials alter column organization_id set not null;
alter table public.credentials alter column organization_id set default '00000000-0000-4000-8000-000000000001';
create index credentials_organization_idx on public.credentials(organization_id,created_at desc);

create function public.is_organization_member(target_org uuid, allowed_roles public.organization_member_role[] default array['ADMIN','REVIEWER','ISSUER','VIEWER']::public.organization_member_role[])
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=(select auth.uid()) and m.status='ACTIVE' and m.role=any(allowed_roles));
$$;
revoke all on function public.is_organization_member(uuid,public.organization_member_role[]) from public,anon;
grant execute on function public.is_organization_member(uuid,public.organization_member_role[]) to authenticated,service_role;
create function public.has_organization_role(allowed_roles public.organization_member_role[] default array['ADMIN','REVIEWER','ISSUER','VIEWER']::public.organization_member_role[])
returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.organization_members m where m.user_id=(select auth.uid()) and m.status='ACTIVE' and m.role=any(allowed_roles));$$;
revoke all on function public.has_organization_role(public.organization_member_role[]) from public,anon;
grant execute on function public.has_organization_role(public.organization_member_role[]) to authenticated,service_role;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
revoke all on public.organizations,public.organization_members from public,anon,authenticated;
grant select on public.organizations,public.organization_members to authenticated;
grant update(name,logo_url,description,website,organization_type) on public.organizations to authenticated;
grant insert,update(role,status),delete on public.organization_members to authenticated;
grant all on public.organizations,public.organization_members to service_role;
create policy organizations_member_read on public.organizations for select to authenticated using(public.is_organization_member(id));
create policy organizations_admin_update on public.organizations for update to authenticated using(public.is_organization_member(id,array['ADMIN']::public.organization_member_role[])) with check(public.is_organization_member(id,array['ADMIN']::public.organization_member_role[]));
create policy organization_members_org_read on public.organization_members for select to authenticated using(public.is_organization_member(organization_id));
create policy organization_members_admin_insert on public.organization_members for insert to authenticated with check(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]));
create policy organization_members_admin_update on public.organization_members for update to authenticated using(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[])) with check(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]));
create policy organization_members_admin_delete on public.organization_members for delete to authenticated using(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]));

drop policy credentials_issuer_read on public.credentials;
drop policy credentials_issuer_create on public.credentials;
drop policy credentials_issuer_update on public.credentials;
drop policy credential_events_issuer_read on public.credential_events;
drop policy credential_badges_issuer_manage on public.credential_badges;
create policy credentials_organization_read on public.credentials for select to authenticated using(public.is_organization_member(organization_id));
create policy credentials_organization_create on public.credentials for insert to authenticated with check(public.is_organization_member(organization_id,array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[]) and issuer_user_id=(select auth.uid()) and status='DRAFT' and not public_visible);
create policy credentials_organization_update on public.credentials for update to authenticated using(public.is_organization_member(organization_id,array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[])) with check(public.is_organization_member(organization_id,array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[]));
create policy credential_events_organization_read on public.credential_events for select to authenticated using(exists(select 1 from public.credentials c where c.id=credential_events.credential_id and public.is_organization_member(c.organization_id)));
create policy credential_badges_organization_manage on public.credential_badges for all to authenticated using(exists(select 1 from public.credentials c where c.id=credential_badges.credential_id and public.is_organization_member(c.organization_id,array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[]))) with check(exists(select 1 from public.credentials c where c.id=credential_badges.credential_id and public.is_organization_member(c.organization_id,array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[])));

drop policy badge_artwork_issuer_read on storage.objects;
drop policy badge_artwork_issuer_upload on storage.objects;
drop policy badge_artwork_issuer_delete on storage.objects;
create policy badge_artwork_organization_read on storage.objects for select to authenticated using(bucket_id='badge-artwork' and public.has_organization_role(array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[]));
create policy badge_artwork_organization_upload on storage.objects for insert to authenticated with check(bucket_id='badge-artwork' and public.has_organization_role(array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[]) and name~('^'||(select auth.uid())::text||'/draft-[a-f0-9-]+\.(webp|jpg|png)$'));
create policy badge_artwork_organization_delete on storage.objects for delete to authenticated using(bucket_id='badge-artwork' and public.has_organization_role(array['ADMIN','REVIEWER','ISSUER']::public.organization_member_role[]) and split_part(name,'/',1)=(select auth.uid())::text);

create or replace function public.enforce_credential_transition() returns trigger language plpgsql set search_path='' as $$
declare actor_role public.organization_member_role;
begin
  if current_user<>'authenticated' then return new;end if;
  select m.role into actor_role from public.organization_members m where m.organization_id=old.organization_id and m.user_id=(select auth.uid()) and m.status='ACTIVE';
  if actor_role is null then raise exception 'Organization access required';end if;
  if new.id<>old.id or new.credential_id<>old.credential_id or new.owner_id<>old.owner_id or new.organization_id<>old.organization_id or new.issuer_id is distinct from old.issuer_id or new.issuer_user_id is distinct from old.issuer_user_id or new.created_at<>old.created_at then raise exception 'Immutable credential field';end if;
  if actor_role in('ISSUER','VIEWER') and not(actor_role='ISSUER' and old.status='DRAFT' and new.status in('DRAFT','PENDING_REVIEW')) then raise exception 'Reviewer access required';end if;
  if old.status in('ISSUED','REVOKED','EXPIRED') and actor_role<>'ADMIN' and not(old.status='ISSUED' and new.status='REVOKED' and actor_role='REVIEWER') then raise exception 'Issued credentials are immutable';end if;
  return new;
end;$$;

create or replace function public.create_credential_draft(actor_user uuid,recipient_user uuid,new_type public.credential_type,new_category public.credential_category,new_title text,new_description text,new_issue_date date,new_expiry_date date,new_badge uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare membership public.organization_members%rowtype; created public.credentials%rowtype;
begin
  select * into membership from public.organization_members where user_id=actor_user and status='ACTIVE' and role in ('ADMIN','REVIEWER','ISSUER') order by created_at limit 1;
  if membership.id is null then raise exception 'Issuer access required'; end if;
  if not exists(select 1 from public.profiles where id=recipient_user) then raise exception 'Candidate not found'; end if;
  insert into public.credentials(owner_id,organization_id,issuer_user_id,credential_type,category,title,description,issue_date,expiry_date,status,public_visible)
  values(recipient_user,membership.organization_id,actor_user,new_type,new_category,new_title,new_description,new_issue_date,new_expiry_date,'DRAFT',false) returning * into created;
  if new_badge is not null then insert into public.credential_badges(credential_id,badge_id) values(created.id,new_badge); end if;
  insert into public.credential_events(credential_id,actor_user_id,event_type,to_status,details) values(created.id,actor_user,'CREATED','DRAFT',jsonb_build_object('organization_id',membership.organization_id));
  return jsonb_build_object('id',created.id,'credential_id',created.credential_id);
end;$$;

create function public.create_credential_draft(actor_user uuid,target_organization uuid,recipient_user uuid,new_type public.credential_type,new_category public.credential_category,new_title text,new_description text,new_issue_date date,new_expiry_date date,new_badge uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare membership public.organization_members%rowtype;created public.credentials%rowtype;
begin
  select * into membership from public.organization_members where organization_id=target_organization and user_id=actor_user and status='ACTIVE' and role in('ADMIN','REVIEWER','ISSUER');if membership.id is null then raise exception 'Issuer access required';end if;
  if not exists(select 1 from public.profiles where id=recipient_user) then raise exception 'Candidate not found';end if;
  insert into public.credentials(owner_id,organization_id,issuer_user_id,credential_type,category,title,description,issue_date,expiry_date,status,public_visible) values(recipient_user,target_organization,actor_user,new_type,new_category,new_title,new_description,new_issue_date,new_expiry_date,'DRAFT',false) returning * into created;
  if new_badge is not null then insert into public.credential_badges(credential_id,badge_id) values(created.id,new_badge);end if;
  insert into public.credential_events(credential_id,actor_user_id,event_type,to_status,details) values(created.id,actor_user,'CREATED','DRAFT',jsonb_build_object('organization_id',target_organization));return jsonb_build_object('id',created.id,'credential_id',created.credential_id);
end;$$;
revoke all on function public.create_credential_draft(uuid,uuid,uuid,public.credential_type,public.credential_category,text,text,date,date,uuid) from public,anon,authenticated;
grant execute on function public.create_credential_draft(uuid,uuid,uuid,public.credential_type,public.credential_category,text,text,date,date,uuid) to service_role;

create or replace function public.transition_credential(actor_user uuid,target_credential uuid,requested_action text,reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare membership public.organization_members%rowtype; current_record public.credentials%rowtype; organization public.organizations%rowtype; holder text; target_status public.credential_status; event_name text;
begin
  select * into current_record from public.credentials where id=target_credential for update;
  if current_record.id is null then raise exception 'Credential not found'; end if;
  select * into membership from public.organization_members where organization_id=current_record.organization_id and user_id=actor_user and status='ACTIVE';
  if membership.id is null then raise exception 'Organization access required'; end if;
  if requested_action='submit' then
    if membership.role not in ('ADMIN','REVIEWER','ISSUER') or current_record.status<>'DRAFT' then raise exception 'Draft issuer access required'; end if;target_status:='PENDING_REVIEW';event_name:='SUBMITTED';update public.credentials set status=target_status where id=current_record.id;
  elsif requested_action='issue' then
    if membership.role not in ('ADMIN','REVIEWER') or current_record.status<>'PENDING_REVIEW' then raise exception 'Reviewer access required'; end if;
    select * into organization from public.organizations where id=current_record.organization_id;if organization.verified_status<>'VERIFIED' then raise exception 'Verified organization required'; end if;
    if current_record.issue_date>current_date then raise exception 'Issue date is in the future'; end if;select btrim(full_name) into holder from public.profiles where id=current_record.owner_id;if holder is null or holder='' then raise exception 'Candidate name required';end if;
    target_status:='ISSUED';event_name:='ISSUED';update public.credentials set status=target_status,public_visible=true,public_holder_name=holder,issued_at=now(),approved_by=actor_user where id=current_record.id;
  elsif requested_action='revoke' then
    if membership.role not in ('ADMIN','REVIEWER') or current_record.status<>'ISSUED' then raise exception 'Reviewer access required'; end if;if reason is null or length(btrim(reason))<8 then raise exception 'Revocation reason required';end if;
    target_status:='REVOKED';event_name:='REVOKED';update public.credentials set status=target_status,revoked_at=now(),revocation_reason=btrim(reason),approved_by=actor_user where id=current_record.id;
  else raise exception 'Unsupported action';end if;
  insert into public.credential_events(credential_id,actor_user_id,event_type,from_status,to_status,details) values(current_record.id,actor_user,event_name,current_record.status,target_status,jsonb_build_object('organization_id',current_record.organization_id));
  return jsonb_build_object('credential_id',current_record.credential_id,'status',target_status);
end;$$;

create or replace function public.verify_public_credential(requested_id text,requester_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare attempts_now integer;found_credential public.credentials%rowtype;result jsonb;effective_status text;issuer_name text;profile_username text;profile_has_avatar boolean;
begin
  if requested_id!~'^UZY-[A-Z0-9]{2,16}-[0-9]{4}-[A-Z0-9]{5,64}$' or requester_hash!~'^[a-f0-9]{64}$' or requester_hash is null or requested_id is null then return jsonb_build_object('outcome','not_found');end if;
  insert into public.verification_rate_limits as limits(requester_hash,window_start,attempts) values(requester_hash,now(),1) on conflict on constraint verification_rate_limits_pkey do update set attempts=case when limits.window_start<=now()-interval '1 minute' then 1 else limits.attempts+1 end,window_start=case when limits.window_start<=now()-interval '1 minute' then now() else limits.window_start end returning attempts into attempts_now;
  if attempts_now>30 then return jsonb_build_object('outcome','rate_limited');end if;
  select * into found_credential from public.credentials c where c.credential_id=requested_id and c.public_visible and c.status in('ISSUED','REVOKED','EXPIRED');
  if found_credential.id is null then insert into public.verification_logs(credential_id,outcome) values(null,'not_found');return jsonb_build_object('outcome','not_found');end if;
  effective_status:=case when found_credential.status='ISSUED' and found_credential.expiry_date<current_date then 'EXPIRED' else found_credential.status::text end;
  select o.name into issuer_name from public.organizations o where o.id=found_credential.organization_id;
  select p.username,(p.avatar_url is not null) into profile_username,profile_has_avatar from public.profiles p where p.id=found_credential.owner_id and p.visibility='public';
  result:=jsonb_build_object('outcome','found','credential',jsonb_build_object('credential_id',found_credential.credential_id,'title',found_credential.title,'description',found_credential.description,'credential_type',found_credential.credential_type,'category',found_credential.category,'holder_name',found_credential.public_holder_name,'issuer',issuer_name,'issue_date',found_credential.issue_date,'expiry_date',found_credential.expiry_date,'status',effective_status,'profile_username',profile_username,'has_avatar',coalesce(profile_has_avatar,false),'verified_at',now(),'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name) from public.credential_badges cb join public.badges b on b.id=cb.badge_id where cb.credential_id=found_credential.id),'[]'::jsonb)));
  insert into public.verification_logs(credential_id,outcome) values(found_credential.id,'found');return result;
end;$$;

commit;
