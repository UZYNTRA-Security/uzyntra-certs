begin;

create type public.credential_type as enum ('COURSE_CERTIFICATE','INTERNSHIP','EMPLOYMENT','CONTRIBUTION','BUG_BOUNTY','APPRECIATION','ACHIEVEMENT');
create type public.credential_status as enum ('ACTIVE','EXPIRED','REVOKED','SUSPENDED');
create type public.badge_category as enum ('COURSE','SECURITY','CONTRIBUTION','INTERNSHIP','RECOGNITION');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 160),
  username text unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  avatar_url text check (avatar_url ~ '^https://' and length(avatar_url) <= 2048),
  bio text check (length(bio) <= 2000),
  linkedin_url text check (linkedin_url ~ '^https://' and length(linkedin_url) <= 2048),
  github_url text check (github_url ~ '^https://' and length(github_url) <= 2048),
  website_url text check (website_url ~ '^https://' and length(website_url) <= 2048),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  credential_id text not null unique default ('UZY-CERT-' || extract(year from current_date)::text || '-' || upper(replace(gen_random_uuid()::text, '-', '')))
    check (credential_id ~ '^UZY-[A-Z0-9]{2,16}-[0-9]{4}-[A-Z0-9]{5,64}$'),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  credential_type public.credential_type not null,
  title text not null check (length(title) between 1 and 240),
  description text check (length(description) <= 5000),
  issue_date date not null,
  expiry_date date check (expiry_date >= issue_date),
  status public.credential_status not null default 'ACTIVE',
  certificate_file_url text check (length(certificate_file_url) <= 2048),
  verification_hash text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  -- Issuer-controlled publication snapshot, independent from user-editable profiles.
  public_visible boolean not null default false,
  public_holder_name text check (length(public_holder_name) between 1 and 160),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not public_visible or public_holder_name is not null)
);
create index credentials_owner_idx on public.credentials(owner_id);
create table public.badges (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (length(description) <= 2000),
  category public.badge_category not null, level text check (length(level) <= 80),
  icon_url text not null check (icon_url ~ '^/badges/[a-zA-Z0-9_-]+\.(png|svg|webp|jpg|jpeg)$'),
  created_at timestamptz not null default now()
);
create table public.credential_badges (
  credential_id uuid not null references public.credentials(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete restrict,
  primary key (credential_id, badge_id)
);
create index credential_badges_badge_idx on public.credential_badges(badge_id);
create table public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references public.credentials(id) on delete set null,
  ip_address inet, -- Deliberately left null by the application; no raw IP retention.
  country text check (country ~ '^[A-Z]{2}$'),
  user_agent text check (length(user_agent) <= 512),
  verified_at timestamptz not null default now(),
  outcome text not null check (outcome in ('found','not_found'))
);
create index verification_logs_time_idx on public.verification_logs(verified_at);
create index verification_logs_credential_idx on public.verification_logs(credential_id);
create table public.verification_rate_limits (
  requester_hash text primary key check (requester_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null, attempts integer not null check (attempts > 0)
);
create index verification_rate_limits_time_idx on public.verification_rate_limits(window_start);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger credentials_touch before update on public.credentials for each row execute function public.touch_updated_at();

-- Provision current and future Auth accounts without copying private metadata.
create function public.create_auth_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values (new.id) on conflict (id) do nothing; return new; end;
$$;
revoke all on function public.create_auth_profile() from public, anon, authenticated;
create trigger uzyntra_auth_profile after insert on auth.users for each row execute function public.create_auth_profile();
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.credentials enable row level security;
alter table public.badges enable row level security;
alter table public.credential_badges enable row level security;
alter table public.verification_logs enable row level security;
alter table public.verification_rate_limits enable row level security;
revoke all on public.profiles, public.credentials, public.badges, public.credential_badges, public.verification_logs, public.verification_rate_limits from public, anon, authenticated;
grant select on public.profiles, public.credentials, public.credential_badges to authenticated;
grant update(full_name, username, avatar_url, bio, linkedin_url, github_url, website_url) on public.profiles to authenticated;
grant select on public.badges to anon, authenticated;
grant all on public.profiles, public.credentials, public.badges, public.credential_badges, public.verification_logs, public.verification_rate_limits to service_role;
create policy profiles_own_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy credentials_own_read on public.credentials for select to authenticated using ((select auth.uid()) = owner_id);
create policy badges_public_read on public.badges for select to anon, authenticated using (true);
create policy credential_badges_own_read on public.credential_badges for select to authenticated using (
  exists(select 1 from public.credentials c where c.id = credential_badges.credential_id and c.owner_id = (select auth.uid()))
);

-- Exact-match, service-only public projection. No credential listing API is granted.
create function public.verify_public_credential(requested_id text, requester_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempts_now integer;
  found_credential public.credentials%rowtype;
  result jsonb;
begin
  if requested_id !~ '^UZY-[A-Z0-9]{2,16}-[0-9]{4}-[A-Z0-9]{5,64}$' or requester_hash !~ '^[a-f0-9]{64}$' or requester_hash is null or requested_id is null then
    return jsonb_build_object('outcome','not_found');
  end if;
  insert into public.verification_rate_limits as limits(requester_hash, window_start, attempts)
  values (requester_hash, now(), 1)
  on conflict on constraint verification_rate_limits_pkey do update set
    attempts = case when limits.window_start <= now() - interval '1 minute' then 1 else limits.attempts + 1 end,
    window_start = case when limits.window_start <= now() - interval '1 minute' then now() else limits.window_start end
  returning attempts into attempts_now;
  if attempts_now > 30 then return jsonb_build_object('outcome','rate_limited'); end if;
  select * into found_credential from public.credentials c where c.credential_id = requested_id and c.public_visible;
  if found_credential.id is null then
    insert into public.verification_logs(credential_id, outcome) values (null, 'not_found');
    return jsonb_build_object('outcome','not_found');
  end if;
  result = jsonb_build_object('outcome','found','credential',jsonb_build_object(
    'credential_id',found_credential.credential_id, 'title',found_credential.title,
    'credential_type',found_credential.credential_type, 'holder_name',found_credential.public_holder_name,
    'issuer','UZYNTRA Security', 'issue_date',found_credential.issue_date, 'expiry_date',found_credential.expiry_date,
    'status',case when found_credential.status = 'ACTIVE' and found_credential.expiry_date < current_date then 'EXPIRED'
                  when found_credential.status = 'ACTIVE' and found_credential.issue_date > current_date then 'NOT_YET_VALID'
                  else found_credential.status::text end,
    'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name)
      from public.credential_badges cb join public.badges b on b.id = cb.badge_id where cb.credential_id = found_credential.id), '[]'::jsonb)
  ));
  insert into public.verification_logs(credential_id, outcome) values (found_credential.id, 'found');
  return result;
end;
$$;
revoke all on function public.verify_public_credential(text,text) from public, anon, authenticated;
grant execute on function public.verify_public_credential(text,text) to service_role;

-- Schedule daily through Supabase Cron; callable only by an operator service role.
create function public.prune_verification_activity() returns void language sql security definer set search_path = '' as $$
  delete from public.verification_rate_limits where window_start < now() - interval '1 day';
  delete from public.verification_logs where verified_at < now() - interval '30 days';
$$;
revoke all on function public.prune_verification_activity() from public, anon, authenticated;
grant execute on function public.prune_verification_activity() to service_role;
commit;
