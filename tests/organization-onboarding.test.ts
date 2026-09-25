import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("organization onboarding supports applications, approval, invites, settings, and isolation", async () => {
  const db = new PGlite();
  const platformAdmin = "10000000-0000-4000-8000-000000000001";
  const applicant = "10000000-0000-4000-8000-000000000002";
  const candidate = "10000000-0000-4000-8000-000000000003";
  const outsider = "10000000-0000-4000-8000-000000000004";
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;insert into auth.users values('${platformAdmin}','admin@uzyntra.com',now()),('${applicant}','admin@university.example',now()),('${candidate}','student@example.com',now()),('${outsider}','outsider@example.com',now());`);
    const dir = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, dir), "utf8"));
    await db.exec(`insert into public.organization_members(organization_id,user_id,role,status) values('00000000-0000-4000-8000-000000000001','${platformAdmin}','ADMIN','ACTIVE') on conflict do nothing;update public.profiles set full_name='Student Candidate' where id='${candidate}';`);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [applicant]);
    const application = await db.query<{ id: string }>(`insert into public.organization_applications(organization_name,organization_slug,organization_type,website,official_email,country,description,applicant_user_id) values('University X','university-x','UNIVERSITY','https://university.example','admin@university.example','Pakistan','A verified education institution applying for issuer access.',$1) returning id`, [applicant]);
    assert.equal(application.rows.length, 1);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [outsider]);
    assert.equal((await db.query("select id from public.organization_applications")).rows.length, 0, "other users cannot read applicant records");
    await db.exec("set role service_role");
    await db.query("select public.admin_review_organization_application($1,$2,'VERIFIED','Approved after domain review')", [platformAdmin, application.rows[0].id]);
    const organization = (await db.query<{ id: string; verified_status: string; subscription_plan: string; subscription_status: string }>("select id,verified_status,subscription_plan,subscription_status from public.organizations where slug='university-x'")).rows[0];
    assert.equal(organization.verified_status, "VERIFIED");
    assert.deepEqual([organization.subscription_plan, organization.subscription_status], ["free", "trial"]);
    assert.equal((await db.query("select id from public.organization_members where organization_id=$1 and user_id=$2 and role='ADMIN'", [organization.id, applicant])).rows.length, 1);
    assert.equal((await db.query("select id from public.organization_audit_logs where organization_id=$1 and action='APPLICATION_VERIFIED'", [organization.id])).rows.length, 1);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [applicant]);
    await db.query("insert into public.organization_invites(organization_id,email,role,invited_by,token_hash) values($1,'issuer@university.example','ISSUER',$2,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')", [organization.id, applicant]);
    await db.query("update public.organization_settings set issuer_display_name='University X Credentials',brand_color='#68e09d',certificate_footer_text='Issued by University X, verified by UZYNTRA Certs' where organization_id=$1", [organization.id]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [outsider]);
    assert.equal((await db.query("select id from public.organization_invites where organization_id=$1", [organization.id])).rows.length, 0);
    assert.equal((await db.query("update public.organization_settings set issuer_display_name='Hijacked' where organization_id=$1 returning organization_id", [organization.id])).rows.length, 0);
    await db.exec("set role service_role");
    const draft = (await db.query<{ value: { id: string } }>("select public.create_credential_draft($1,$2,$3,'COURSE_CERTIFICATE','COURSE','University X Course',null,current_date,null,null) value", [applicant, organization.id, candidate])).rows[0].value;
    await db.query("update public.organizations set verified_status='SUSPENDED' where id=$1", [organization.id]);
    await db.query("select public.transition_credential($1,$2,'submit',null)", [applicant, draft.id]);
    await assert.rejects(db.query("select public.transition_credential($1,$2,'issue',null)", [applicant, draft.id]), /Verified organization required/);
  } finally { await db.close(); }
});
