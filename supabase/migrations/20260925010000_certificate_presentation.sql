begin;

create table public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 160),
  type public.credential_type not null,
  description text check(length(description) <= 2000),
  template_file text not null check(length(template_file) <= 2048),
  preview_image text check(length(preview_image) <= 2048),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index certificate_templates_type_active_idx on public.certificate_templates(type) where is_active;
create trigger certificate_templates_touch before update on public.certificate_templates for each row execute function public.touch_updated_at();

insert into public.certificate_templates(name,type,description,template_file,preview_image,is_active) values
  ('Course Certificate','COURSE_CERTIFICATE','Professional UZYNTRA course completion certificate.','course-certificate','/brand/certificate-header.svg',true),
  ('Internship Certificate','INTERNSHIP','UZYNTRA internship completion certificate.','internship-certificate','/brand/certificate-header.svg',true),
  ('Employment Verification','EMPLOYMENT','Employment verification certificate.','employment-verification','/brand/certificate-header.svg',true),
  ('Contribution Award','CONTRIBUTION','Contribution recognition certificate.','contribution-award','/brand/certificate-header.svg',true),
  ('Bug Bounty Recognition','BUG_BOUNTY','Responsible vulnerability research recognition.','bug-bounty-recognition','/brand/certificate-header.svg',true),
  ('Appreciation Certificate','APPRECIATION','Appreciation and recognition certificate.','appreciation-certificate','/brand/certificate-header.svg',true),
  ('Achievement Certificate','ACHIEVEMENT','Professional achievement certificate.','achievement-certificate','/brand/certificate-header.svg',true)
on conflict do nothing;

alter table public.credentials add column if not exists certificate_slug text;
update public.credentials set certificate_slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || lower(right(credential_id, 8)) where certificate_slug is null;
alter table public.credentials alter column certificate_slug set not null;
alter table public.credentials add constraint credentials_certificate_slug_format check(certificate_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{5,16}$');
create unique index if not exists credentials_certificate_slug_key on public.credentials(certificate_slug);

create or replace function public.make_certificate_slug(new_title text, public_id text)
returns text language sql immutable set search_path='' as $$
  select trim(both '-' from lower(regexp_replace(coalesce(new_title,'credential'), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || lower(right(public_id, 8));
$$;
revoke all on function public.make_certificate_slug(text,text) from public,anon,authenticated;
grant execute on function public.make_certificate_slug(text,text) to authenticated,service_role;

create or replace function public.set_certificate_slug() returns trigger language plpgsql set search_path='' as $$
begin
  if new.certificate_slug is null or new.certificate_slug = '' then
    new.certificate_slug := public.make_certificate_slug(new.title, new.credential_id);
  end if;
  return new;
end; $$;
revoke all on function public.set_certificate_slug() from public,anon,authenticated;
drop trigger if exists credentials_certificate_slug on public.credentials;
create trigger credentials_certificate_slug before insert on public.credentials for each row execute function public.set_certificate_slug();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('certificates','certificates',false,10485760,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy certificates_candidate_read on storage.objects for select to authenticated using (
  bucket_id='certificates' and exists(select 1 from public.credentials c where name = c.credential_id || '/certificate.pdf' and c.owner_id=(select auth.uid()) and c.status='ISSUED')
);
create policy certificates_org_read on storage.objects for select to authenticated using (
  bucket_id='certificates' and exists(select 1 from public.credentials c where name = c.credential_id || '/certificate.pdf' and public.is_organization_member(c.organization_id,array['ADMIN','REVIEWER','ISSUER','VIEWER']::public.organization_member_role[]))
);

grant select on public.certificate_templates to authenticated;
grant all on public.certificate_templates to service_role;
alter table public.certificate_templates enable row level security;
create policy certificate_templates_member_read on public.certificate_templates for select to authenticated using(public.has_organization_role());

create table public.credential_notifications (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete restrict,
  event_type text not null check(event_type in ('credential_issued')),
  payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload) = 'object'),
  status text not null default 'PENDING' check(status in ('PENDING','SENT','FAILED','CANCELLED')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.credential_notifications enable row level security;
grant all on public.credential_notifications to service_role;
grant select on public.credential_notifications to authenticated;
create policy credential_notifications_org_read on public.credential_notifications for select to authenticated using(
  exists(select 1 from public.credentials c where c.id=credential_notifications.credential_id and public.is_organization_member(c.organization_id,array['ADMIN','REVIEWER']::public.organization_member_role[]))
);

create or replace function public.queue_credential_issued_notification() returns trigger language plpgsql set search_path='' as $$
begin
  if new.event_type='ISSUED' then
    insert into public.credential_notifications(credential_id,event_type,payload)
    values(new.credential_id,'credential_issued',jsonb_build_object('source_event_id',new.id))
    on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function public.queue_credential_issued_notification() from public,anon,authenticated;
drop trigger if exists credential_events_queue_notification on public.credential_events;
create trigger credential_events_queue_notification after insert on public.credential_events for each row execute function public.queue_credential_issued_notification();

create or replace function public.admin_create_organization(actor_user uuid, new_name text, new_slug text, new_type public.organization_type, new_description text default null, new_website text default null, new_status public.organization_verified_status default 'PENDING')
returns jsonb language plpgsql security definer set search_path='' as $$
declare created public.organizations%rowtype;
begin
  if not exists(select 1 from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and user_id=actor_user and role='ADMIN' and status='ACTIVE') then
    raise exception 'Admin access required';
  end if;
  insert into public.organizations(name,slug,organization_type,description,website,verified_status)
  values(btrim(new_name),lower(btrim(new_slug)),new_type,nullif(btrim(new_description),''),nullif(btrim(new_website),''),new_status)
  returning * into created;
  return jsonb_build_object('id',created.id,'slug',created.slug);
end; $$;
revoke all on function public.admin_create_organization(uuid,text,text,public.organization_type,text,text,public.organization_verified_status) from public,anon,authenticated;
grant execute on function public.admin_create_organization(uuid,text,text,public.organization_type,text,text,public.organization_verified_status) to service_role;

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
  result:=jsonb_build_object('outcome','found','credential',jsonb_build_object('credential_id',found_credential.credential_id,'certificate_slug',found_credential.certificate_slug,'title',found_credential.title,'description',found_credential.description,'credential_type',found_credential.credential_type,'category',found_credential.category,'holder_name',found_credential.public_holder_name,'issuer',issuer_name,'issue_date',found_credential.issue_date,'expiry_date',found_credential.expiry_date,'status',effective_status,'profile_username',profile_username,'has_avatar',coalesce(profile_has_avatar,false),'verified_at',now(),'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name) from public.credential_badges cb join public.badges b on b.id=cb.badge_id where cb.credential_id=found_credential.id and b.active),'[]'::jsonb)));
  insert into public.verification_logs(credential_id,outcome) values(found_credential.id,'found');return result;
end;$$;

commit;
