begin;

do $$
declare
  candidate uuid;
  issuer uuid;
  badge_id uuid;
  cred uuid;
begin
  select id into candidate from public.profiles where username = 'usamamatrix' limit 1;
  if candidate is null then
    return;
  end if;

  select id into issuer from auth.users where lower(email) = 'admin@uzyntra.com' limit 1;
  if issuer is null then
    select user_id into issuer from public.organization_members where organization_id='00000000-0000-4000-8000-000000000001' and role='ADMIN' and status='ACTIVE' order by created_at limit 1;
  end if;
  if issuer is null then
    return;
  end if;

  insert into public.badges(name, slug, description, category, level, icon_url, active)
  values('Bug Bounty Researcher', 'bug-bounty-researcher', 'UZYNTRA recognition badge for responsible vulnerability research.', 'SECURITY', 'Professional', '/badges/bug-bounty-researcher.png', true)
  on conflict(slug) do update set name=excluded.name, description=excluded.description, category=excluded.category, level=excluded.level, icon_url=excluded.icon_url, active=true
  returning id into badge_id;

  update public.profiles set visibility='public' where id=candidate;
  insert into public.credentials(owner_id, organization_id, issuer_user_id, approved_by, credential_type, category, title, description, issue_date, status, issued_at, public_visible, public_holder_name)
  select candidate, '00000000-0000-4000-8000-000000000001', issuer, issuer, 'BUG_BOUNTY', 'BUG_BOUNTY', 'Bug Bounty Researcher Recognition', 'UZYNTRA recognition for responsible vulnerability research.', current_date, 'ISSUED', now(), true, p.full_name
  from public.profiles p
  where p.id = candidate and not exists(select 1 from public.credentials existing where existing.owner_id=candidate and existing.title='Bug Bounty Researcher Recognition')
  returning id into cred;

  if cred is not null then
    insert into public.credential_badges(credential_id, badge_id) values(cred, badge_id) on conflict do nothing;
    insert into public.credential_events(credential_id, actor_user_id, event_type, to_status, details)
    values(cred, issuer, 'ISSUED', 'ISSUED', jsonb_build_object('seeded_for', 'usamamatrix', 'organization_id', '00000000-0000-4000-8000-000000000001'));
  end if;
end $$;

commit;
