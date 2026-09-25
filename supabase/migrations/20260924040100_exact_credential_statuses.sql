begin;
alter table public.credentials drop constraint credentials_lifecycle_check;
drop policy credentials_own_read on public.credentials;
drop policy credentials_issuer_create on public.credentials;
alter table public.credentials alter column status drop default;
alter type public.credential_status rename to credential_status_legacy;
create type public.credential_status as enum ('DRAFT','PENDING_REVIEW','ISSUED','REVOKED','EXPIRED');
alter table public.credentials alter column status type public.credential_status using status::text::public.credential_status;
alter table public.credential_events alter column from_status type public.credential_status using from_status::text::public.credential_status;
alter table public.credential_events alter column to_status type public.credential_status using to_status::text::public.credential_status;
alter table public.credentials alter column status set default 'DRAFT';
alter table public.credentials add constraint credentials_lifecycle_check check (
  (status in ('DRAFT','PENDING_REVIEW') and not public_visible and issued_at is null and revoked_at is null)
  or (status in ('ISSUED','EXPIRED') and public_visible and public_holder_name is not null and issued_at is not null and revoked_at is null)
  or (status='REVOKED' and public_visible and public_holder_name is not null and issued_at is not null and revoked_at is not null and revocation_reason is not null)
);
create policy credentials_own_read on public.credentials for select to authenticated using ((select auth.uid())=owner_id and status in ('ISSUED','REVOKED','EXPIRED'));
create policy credentials_issuer_create on public.credentials for insert to authenticated with check (
  public.is_active_issuer() and issuer_id=(select id from public.credential_issuers where user_id=(select auth.uid()) and active)
  and status='DRAFT' and not public_visible and issued_at is null and revoked_at is null
);
drop type public.credential_status_legacy;
commit;
