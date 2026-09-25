begin;

create function public.create_credential_draft(
  actor_user uuid, recipient_user uuid, new_type public.credential_type, new_category public.credential_category,
  new_title text, new_description text, new_issue_date date, new_expiry_date date, new_badge uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare membership public.credential_issuers%rowtype; created public.credentials%rowtype;
begin
  select * into membership from public.credential_issuers where user_id=actor_user and active;
  if membership.id is null then raise exception 'Issuer access required'; end if;
  if not exists(select 1 from public.profiles where id=recipient_user) then raise exception 'Candidate not found'; end if;
  insert into public.credentials(owner_id,issuer_id,credential_type,category,title,description,issue_date,expiry_date,status,public_visible)
  values(recipient_user,membership.id,new_type,new_category,new_title,new_description,new_issue_date,new_expiry_date,'DRAFT',false) returning * into created;
  if new_badge is not null then insert into public.credential_badges(credential_id,badge_id) values(created.id,new_badge); end if;
  insert into public.credential_events(credential_id,actor_user_id,event_type,to_status,details)
  values(created.id,actor_user,'CREATED','DRAFT',jsonb_build_object('recipient_id',recipient_user));
  return jsonb_build_object('id',created.id,'credential_id',created.credential_id);
end; $$;
revoke all on function public.create_credential_draft(uuid,uuid,public.credential_type,public.credential_category,text,text,date,date,uuid) from public,anon,authenticated;
grant execute on function public.create_credential_draft(uuid,uuid,public.credential_type,public.credential_category,text,text,date,date,uuid) to service_role;

create function public.transition_credential(actor_user uuid, target_credential uuid, requested_action text, reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare membership public.credential_issuers%rowtype; current_record public.credentials%rowtype; holder text; target_status public.credential_status; event_name text;
begin
  select * into membership from public.credential_issuers where user_id=actor_user and active;
  if membership.id is null then raise exception 'Issuer access required'; end if;
  select * into current_record from public.credentials where id=target_credential and issuer_id is not null for update;
  if current_record.id is null then raise exception 'Credential not found'; end if;
  if requested_action='submit' then
    if current_record.status<>'DRAFT' then raise exception 'Draft required'; end if; target_status:='PENDING_REVIEW';event_name:='SUBMITTED';
    update public.credentials set status=target_status where id=current_record.id;
  elsif requested_action='issue' then
    if membership.role not in ('REVIEWER','ADMIN') then raise exception 'Reviewer access required'; end if;
    if current_record.status<>'PENDING_REVIEW' then raise exception 'Pending review required'; end if;
    if current_record.issue_date>current_date then raise exception 'Issue date is in the future'; end if;
    select btrim(full_name) into holder from public.profiles where id=current_record.owner_id;
    if holder is null or holder='' then raise exception 'Candidate name required'; end if;
    target_status:='ISSUED';event_name:='ISSUED';
    update public.credentials set status=target_status,public_visible=true,public_holder_name=holder,issued_at=now() where id=current_record.id;
  elsif requested_action='revoke' then
    if membership.role not in ('REVIEWER','ADMIN') then raise exception 'Reviewer access required'; end if;
    if current_record.status<>'ISSUED' then raise exception 'Issued credential required'; end if;
    if reason is null or length(btrim(reason))<8 then raise exception 'Revocation reason required'; end if;
    target_status:='REVOKED';event_name:='REVOKED';
    update public.credentials set status=target_status,revoked_at=now(),revocation_reason=btrim(reason) where id=current_record.id;
  else raise exception 'Unsupported action'; end if;
  insert into public.credential_events(credential_id,actor_user_id,event_type,from_status,to_status,details)
  values(current_record.id,actor_user,event_name,current_record.status,target_status,case when requested_action='revoke' then jsonb_build_object('reason',btrim(reason)) else '{}'::jsonb end);
  return jsonb_build_object('credential_id',current_record.credential_id,'status',target_status);
end; $$;
revoke all on function public.transition_credential(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.transition_credential(uuid,uuid,text,text) to service_role;

commit;
