begin;

do $$ begin
  if not exists (select 1 from pg_enum where enumtypid='public.organization_type'::regtype and enumlabel='TRAINING_INSTITUTE') then alter type public.organization_type add value 'TRAINING_INSTITUTE'; end if;
  if not exists (select 1 from pg_enum where enumtypid='public.organization_type'::regtype and enumlabel='SOFTWARE_HOUSE') then alter type public.organization_type add value 'SOFTWARE_HOUSE'; end if;
  if not exists (select 1 from pg_enum where enumtypid='public.organization_type'::regtype and enumlabel='COMPANY') then alter type public.organization_type add value 'COMPANY'; end if;
  if not exists (select 1 from pg_enum where enumtypid='public.organization_type'::regtype and enumlabel='GOVERNMENT') then alter type public.organization_type add value 'GOVERNMENT'; end if;
  if not exists (select 1 from pg_enum where enumtypid='public.organization_verified_status'::regtype and enumlabel='UNDER_REVIEW') then alter type public.organization_verified_status add value 'UNDER_REVIEW'; end if;
  if not exists (select 1 from pg_enum where enumtypid='public.organization_verified_status'::regtype and enumlabel='REJECTED') then alter type public.organization_verified_status add value 'REJECTED'; end if;
end $$;

alter table public.organizations
  add column if not exists official_email text check(official_email is null or official_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column if not exists country text check(country is null or length(country)<=100),
  add column if not exists subscription_plan text not null default 'free' check(subscription_plan in ('free','starter','enterprise')),
  add column if not exists subscription_status text not null default 'trial' check(subscription_status in ('trial','active','expired'));

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null check(length(btrim(organization_name)) between 2 and 160),
  organization_slug text not null check(organization_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  organization_type public.organization_type not null,
  website text check(website is null or (website ~ '^https://' and length(website)<=2048)),
  official_email text not null check(official_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  country text check(country is null or length(country)<=100),
  description text check(description is null or length(description)<=2000),
  logo_url text check(logo_url is null or (logo_url ~ '^/(brand|api/organization-logo)/' and length(logo_url)<=2048)),
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  status public.organization_verified_status not null default 'PENDING',
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text check(review_note is null or length(review_note)<=1000),
  organization_id uuid references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_slug)
);
create trigger organization_applications_touch before update on public.organization_applications for each row execute function public.touch_updated_at();

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email text not null check(email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.organization_member_role not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  status public.organization_member_status not null default 'INVITED',
  accepted_by uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  unique(organization_id,email)
);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  issuer_display_name text not null check(length(btrim(issuer_display_name)) between 2 and 160),
  brand_color text check(brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  certificate_footer_text text check(certificate_footer_text is null or length(certificate_footer_text)<=240),
  logo_url text check(logo_url is null or (logo_url ~ '^/(brand|api/organization-logo)/' and length(logo_url)<=2048)),
  updated_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into public.organization_settings(organization_id,issuer_display_name,logo_url)
select id,name,logo_url from public.organizations
on conflict(organization_id) do nothing;

create table if not exists public.organization_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null check(length(action) between 2 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.organization_audit_logs enable row level security;
create policy organization_audit_logs_member_read on public.organization_audit_logs for select to authenticated using(
  organization_id is not null and public.is_organization_member(organization_id,array['ADMIN','REVIEWER','VIEWER']::public.organization_member_role[])
);
grant select on public.organization_audit_logs to authenticated;
grant all on public.organization_applications,public.organization_invites,public.organization_settings,public.organization_audit_logs to service_role;

alter table public.organization_applications enable row level security;
alter table public.organization_invites enable row level security;
alter table public.organization_settings enable row level security;
revoke all on public.organization_applications,public.organization_invites,public.organization_settings from public,anon,authenticated;
grant select,insert on public.organization_applications to authenticated;
grant select,insert,update on public.organization_invites to authenticated;
grant select,update on public.organization_settings to authenticated;

create policy organization_applications_own_read on public.organization_applications for select to authenticated using(applicant_user_id=(select auth.uid()));
create policy organization_applications_own_insert on public.organization_applications for insert to authenticated with check(applicant_user_id=(select auth.uid()) and status='PENDING');
create policy organization_invites_org_admin_read on public.organization_invites for select to authenticated using(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]));
create policy organization_invites_org_admin_insert on public.organization_invites for insert to authenticated with check(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]) and invited_by=(select auth.uid()));
create policy organization_invites_org_admin_update on public.organization_invites for update to authenticated using(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[])) with check(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]));
create policy organization_settings_member_read on public.organization_settings for select to authenticated using(public.is_organization_member(organization_id));
create policy organization_settings_admin_update on public.organization_settings for update to authenticated using(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[])) with check(public.is_organization_member(organization_id,array['ADMIN']::public.organization_member_role[]));

create or replace function public.admin_review_organization_application(actor_user uuid,target_application uuid,new_status public.organization_verified_status,note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare app public.organization_applications%rowtype; created_org public.organizations%rowtype;
begin
  if not exists(select 1 from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and user_id=actor_user and role='ADMIN' and status='ACTIVE') then raise exception 'Platform admin required'; end if;
  if new_status not in ('UNDER_REVIEW','VERIFIED','REJECTED','SUSPENDED') then raise exception 'Unsupported status'; end if;
  select * into app from public.organization_applications where id=target_application for update;
  if app.id is null then raise exception 'Application not found'; end if;
  if new_status='VERIFIED' then
    insert into public.organizations(name,slug,organization_type,website,official_email,country,description,logo_url,verified_status)
    values(app.organization_name,app.organization_slug,app.organization_type,app.website,app.official_email,app.country,app.description,app.logo_url,'VERIFIED')
    on conflict(slug) do update set verified_status='VERIFIED'
    returning * into created_org;
    insert into public.organization_members(organization_id,user_id,role,status)
    values(created_org.id,app.applicant_user_id,'ADMIN','ACTIVE')
    on conflict(organization_id,user_id) do update set role='ADMIN',status='ACTIVE';
    insert into public.organization_settings(organization_id,issuer_display_name,logo_url,updated_by)
    values(created_org.id,created_org.name,created_org.logo_url,actor_user)
    on conflict(organization_id) do update set issuer_display_name=excluded.issuer_display_name,logo_url=excluded.logo_url,updated_by=actor_user,updated_at=now();
    update public.organization_applications set status='VERIFIED',reviewed_by=actor_user,reviewed_at=now(),review_note=note,organization_id=created_org.id where id=target_application;
  else
    update public.organization_applications set status=new_status,reviewed_by=actor_user,reviewed_at=now(),review_note=note where id=target_application returning * into app;
    if app.organization_id is not null and new_status='SUSPENDED' then update public.organizations set verified_status='SUSPENDED' where id=app.organization_id; end if;
  end if;
  insert into public.organization_audit_logs(organization_id,actor_user_id,action,details)
  values(coalesce(created_org.id,app.organization_id),actor_user,'APPLICATION_'||new_status,jsonb_build_object('application_id',target_application,'note',note));
  return jsonb_build_object('status',new_status,'organization_id',coalesce(created_org.id,app.organization_id));
end;$$;
revoke all on function public.admin_review_organization_application(uuid,uuid,public.organization_verified_status,text) from public,anon,authenticated;
grant execute on function public.admin_review_organization_application(uuid,uuid,public.organization_verified_status,text) to service_role;

commit;
