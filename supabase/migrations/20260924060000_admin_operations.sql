begin;

alter table public.badges add column if not exists active boolean not null default true;
create index if not exists badges_active_idx on public.badges(active, name);

do $$
declare
  admin_user uuid;
begin
  select id into admin_user from auth.users where lower(email) = 'admin@uzyntra.com' limit 1;
  if admin_user is not null then
    insert into public.profiles(id, full_name, username, visibility)
    values(admin_user, 'UZYNTRA', 'uzyntra', 'private')
    on conflict(id) do update set full_name = 'UZYNTRA', username = 'uzyntra', visibility = 'private';

    insert into public.organization_members(organization_id, user_id, role, status)
    values('00000000-0000-4000-8000-000000000001', admin_user, 'ADMIN', 'ACTIVE')
    on conflict(organization_id, user_id) do update set role = 'ADMIN', status = 'ACTIVE';
  end if;
end $$;

create or replace function public.admin_update_organization_status(actor_user uuid, target_organization uuid, new_status public.organization_verified_status)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and user_id=actor_user and role='ADMIN' and status='ACTIVE') then
    raise exception 'Admin access required';
  end if;
  update public.organizations set verified_status = new_status where id = target_organization;
  return jsonb_build_object('status', new_status);
end; $$;
revoke all on function public.admin_update_organization_status(uuid, uuid, public.organization_verified_status) from public, anon, authenticated;
grant execute on function public.admin_update_organization_status(uuid, uuid, public.organization_verified_status) to service_role;

create or replace function public.admin_upsert_organization_member(actor_user uuid, target_organization uuid, target_user uuid, new_role public.organization_member_role, new_status public.organization_member_status default 'ACTIVE')
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and user_id=actor_user and role='ADMIN' and status='ACTIVE') then
    raise exception 'Admin access required';
  end if;
  if not exists(select 1 from public.profiles where id = target_user) then
    raise exception 'Profile required';
  end if;
  insert into public.organization_members(organization_id, user_id, role, status)
  values(target_organization, target_user, new_role, new_status)
  on conflict(organization_id, user_id) do update set role = excluded.role, status = excluded.status;
  return jsonb_build_object('user_id', target_user, 'role', new_role, 'status', new_status);
end; $$;
revoke all on function public.admin_upsert_organization_member(uuid, uuid, uuid, public.organization_member_role, public.organization_member_status) from public, anon, authenticated;
grant execute on function public.admin_upsert_organization_member(uuid, uuid, uuid, public.organization_member_role, public.organization_member_status) to service_role;

create or replace function public.admin_remove_organization_member(actor_user uuid, target_membership uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare removed_org uuid;
begin
  if not exists(select 1 from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and user_id=actor_user and role='ADMIN' and status='ACTIVE') then
    raise exception 'Admin access required';
  end if;
  delete from public.organization_members where id = target_membership returning organization_id into removed_org;
  return jsonb_build_object('organization_id', removed_org);
end; $$;
revoke all on function public.admin_remove_organization_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_remove_organization_member(uuid, uuid) to service_role;

create or replace function public.prevent_credential_event_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Credential audit events are immutable'; end;
$$;
drop trigger if exists credential_events_immutable on public.credential_events;
create trigger credential_events_immutable before update or delete on public.credential_events for each row execute function public.prevent_credential_event_mutation();

create or replace function public.get_public_profile(requested_username text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username',p.username,'full_name',p.full_name,'headline',p.headline,'bio',p.bio,'country',p.country,
    'linkedin_url',p.linkedin_url,'github_url',p.github_url,'portfolio_url',p.portfolio_url,
    'has_avatar',p.avatar_url is not null,'avatar_updated_at',p.avatar_updated_at,
    'credentials',coalesce((select jsonb_agg(jsonb_build_object(
      'credential_id',c.credential_id,'title',c.title,'credential_type',c.credential_type,'issue_date',c.issue_date,
      'expiry_date',c.expiry_date,'status',case when c.status='ISSUED' and c.expiry_date<current_date then 'EXPIRED' else c.status end,
      'public_visible',c.public_visible,
      'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name)
        from public.credential_badges cb join public.badges b on b.id=cb.badge_id where cb.credential_id=c.id and b.active),'[]'::jsonb)
    ) order by c.issue_date desc,c.credential_id) from public.credentials c
    where c.owner_id=p.id and c.public_visible and c.status in ('ISSUED','EXPIRED','REVOKED')),'[]'::jsonb)
  ) from public.profiles p where p.username=requested_username and p.visibility='public';
$$;

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
  result:=jsonb_build_object('outcome','found','credential',jsonb_build_object('credential_id',found_credential.credential_id,'title',found_credential.title,'description',found_credential.description,'credential_type',found_credential.credential_type,'category',found_credential.category,'holder_name',found_credential.public_holder_name,'issuer',issuer_name,'issue_date',found_credential.issue_date,'expiry_date',found_credential.expiry_date,'status',effective_status,'profile_username',profile_username,'has_avatar',coalesce(profile_has_avatar,false),'verified_at',now(),'badges',coalesce((select jsonb_agg(jsonb_build_object('name',b.name,'slug',b.slug,'icon_url',b.icon_url,'category',b.category,'level',b.level) order by b.name) from public.credential_badges cb join public.badges b on b.id=cb.badge_id where cb.credential_id=found_credential.id and b.active),'[]'::jsonb)));
  insert into public.verification_logs(credential_id,outcome) values(found_credential.id,'found');return result;
end;$$;

do $$
declare
  candidate uuid;
  issuer uuid;
  badge record;
  cred uuid;
  course_title text;
  issued_on date := current_date;
begin
  select id into candidate from public.profiles where username = 'usamamatrix' limit 1;
  select id into issuer from auth.users where lower(email) = 'admin@uzyntra.com' limit 1;
  if issuer is null then
    select user_id into issuer from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and role='ADMIN' and status='ACTIVE' order by created_at limit 1;
  end if;

  if candidate is not null then
  insert into public.badges(name, slug, description, category, level, icon_url, active) values
    ('AI Engineering', 'ai-engineering', 'UZYNTRA course badge for AI engineering.', 'COURSE', 'Professional', '/badges/ai-engineering.png', true),
    ('API Security Professional', 'api-security-professional', 'UZYNTRA course badge for API security.', 'SECURITY', 'Professional', '/badges/api-security-professional.png', true),
    ('App Development', 'app-development', 'UZYNTRA course badge for application development.', 'COURSE', 'Professional', '/badges/app-development.png', true),
    ('Blockchain Security', 'blockchain-security', 'UZYNTRA course badge for blockchain security.', 'SECURITY', 'Professional', '/badges/blockchain-security.png', true),
    ('Certified Ethical Hacker', 'certified-ethical-hacker', 'UZYNTRA recognition badge for ethical hacking.', 'SECURITY', 'Professional', '/badges/certified-ethical-hacker.png', true),
    ('Cloud Security', 'cloud-security', 'UZYNTRA course badge for cloud security.', 'SECURITY', 'Professional', '/badges/cloud-security.png', true),
    ('Cybersecurity', 'cybersecurity', 'UZYNTRA cybersecurity course badge.', 'SECURITY', 'Professional', '/badges/cybersecurity.png', true),
    ('Data Science Professional', 'data-science-professional', 'UZYNTRA course badge for data science.', 'COURSE', 'Professional', '/badges/data-science-professional.png', true),
    ('DevSecOps Engineer', 'devsecops-engineer', 'UZYNTRA course badge for DevSecOps engineering.', 'SECURITY', 'Professional', '/badges/devsecops-engineer.png', true),
    ('Digital Forensics', 'digital-forensics', 'UZYNTRA course badge for digital forensics.', 'SECURITY', 'Professional', '/badges/digital-forensics.png', true),
    ('Offensive AI', 'offensive-ai', 'UZYNTRA course badge for offensive AI.', 'SECURITY', 'Professional', '/badges/offensive-ai.png', true),
    ('Penetration Testing', 'penetration-testing', 'UZYNTRA course badge for penetration testing.', 'SECURITY', 'Professional', '/badges/penetration-testing.png', true),
    ('Python Professional', 'python-professional', 'UZYNTRA course badge for Python.', 'COURSE', 'Professional', '/badges/python-professional.png', true),
    ('SOC Analyst', 'soc-analyst', 'UZYNTRA course badge for security operations analysis.', 'SECURITY', 'Professional', '/badges/soc-analyst.png', true),
    ('UZYNTRA Certified AI Expert', 'ucae', 'UZYNTRA certification badge.', 'COURSE', 'Certified', '/badges/ucae.png', true),
    ('UZYNTRA Certified Blockchain Technician', 'ucbt', 'UZYNTRA certification badge.', 'COURSE', 'Certified', '/badges/ucbt.png', true),
    ('UZYNTRA Certified Cybersecurity Expert', 'ucce', 'UZYNTRA certification badge.', 'SECURITY', 'Certified', '/badges/ucce.png', true),
    ('UZYNTRA Certified Red Team', 'ucrt', 'UZYNTRA certification badge.', 'SECURITY', 'Certified', '/badges/ucrt.png', true),
    ('UZYNTRA Certified Security Engineer', 'ucse', 'UZYNTRA certification badge.', 'SECURITY', 'Certified', '/badges/ucse.png', true),
    ('Web Development', 'web-development', 'UZYNTRA course badge for web development.', 'COURSE', 'Professional', '/badges/web-development.png', true)
  on conflict(slug) do update set name=excluded.name, description=excluded.description, category=excluded.category, level=excluded.level, icon_url=excluded.icon_url, active=true;

  if issuer is not null then
    update public.profiles set visibility='public' where id=candidate;
    for badge in select * from public.badges where icon_url like '/badges/%' and active order by name loop
      course_title := badge.name || ' Certificate';
      insert into public.credentials(owner_id, organization_id, issuer_user_id, approved_by, credential_type, category, title, description, issue_date, status, issued_at, public_visible, public_holder_name)
      select candidate, '00000000-0000-4000-8000-000000000001', issuer, issuer, 'COURSE_CERTIFICATE', 'COURSE', course_title, badge.description, issued_on, 'ISSUED', now(), true, p.full_name
      from public.profiles p
      where p.id = candidate and not exists(select 1 from public.credentials existing where existing.owner_id=candidate and existing.title=course_title)
      returning id into cred;
      if cred is not null then
        insert into public.credential_badges(credential_id, badge_id) values(cred, badge.id) on conflict do nothing;
        insert into public.credential_events(credential_id, actor_user_id, event_type, to_status, details)
        values(cred, issuer, 'ISSUED', 'ISSUED', jsonb_build_object('seeded_for', 'usamamatrix', 'organization_id', '00000000-0000-4000-8000-000000000001'));
      end if;
      cred := null;
    end loop;
  end if;
  end if;
end $$;

commit;
