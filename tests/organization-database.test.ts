import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("organizations enforce roles, verification, ownership, and cross-organization isolation", async () => {
  const db = new PGlite();
  const admin = "10000000-0000-4000-8000-000000000001";
  const reviewer = "10000000-0000-4000-8000-000000000002";
  const issuer = "10000000-0000-4000-8000-000000000003";
  const viewer = "10000000-0000-4000-8000-000000000004";
  const outsider = "10000000-0000-4000-8000-000000000005";
  const candidate = "10000000-0000-4000-8000-000000000006";
  const secondOrg = "20000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;insert into auth.users values('${admin}','admin@example.com',now()),('${reviewer}','reviewer@example.com',now()),('${issuer}','issuer@example.com',now()),('${viewer}','viewer@example.com',now()),('${outsider}','outsider@example.com',now()),('${candidate}','candidate@example.com',now());`);
    const dir = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, dir), "utf8"));
    const seeded = await db.query<{ verified_status: string }>("select verified_status from public.organizations where slug='uzyntra-security'");
    assert.equal(seeded.rows[0].verified_status, "VERIFIED");
    await db.exec(`insert into public.organizations(id,name,slug,organization_type,verified_status) values('${secondOrg}','Pending Partner','pending-partner','TRAINING_PROVIDER','PENDING');insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000001','${admin}','ADMIN'),('00000000-0000-4000-8000-000000000001','${reviewer}','REVIEWER'),('00000000-0000-4000-8000-000000000001','${issuer}','ISSUER'),('00000000-0000-4000-8000-000000000001','${viewer}','VIEWER'),('${secondOrg}','${outsider}','ADMIN');update public.profiles set full_name='Candidate' where id='${candidate}';`);
    await db.exec("set role service_role");
    const draft = (await db.query<{ value: { id: string } }>("select public.create_credential_draft($1,$2,$3,'COURSE_CERTIFICATE','COURSE','Organization Credential',null,current_date,null,null) value", [issuer, "00000000-0000-4000-8000-000000000001", candidate])).rows[0].value;
    const ownership = await db.query<{ organization_id: string; issuer_user_id: string }>("select organization_id,issuer_user_id from public.credentials where id=$1", [draft.id]);
    assert.equal(ownership.rows[0].issuer_user_id, issuer);
    await assert.rejects(db.query("select public.create_credential_draft($1,$2,$3,'COURSE_CERTIFICATE','COURSE','Cross Org',null,current_date,null,null)", [issuer, secondOrg, candidate]), /Issuer access required/);
    await db.query("select public.transition_credential($1,$2,'submit',null)", [issuer, draft.id]);
    await assert.rejects(db.query("select public.transition_credential($1,$2,'issue',null)", [issuer, draft.id]), /Reviewer access required/);
    await db.query("select public.transition_credential($1,$2,'issue',null)", [reviewer, draft.id]);
    assert.equal((await db.query<{ approved_by: string }>("select approved_by from public.credentials where id=$1", [draft.id])).rows[0].approved_by, reviewer);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [outsider]);
    assert.equal((await db.query("select id from public.credentials where id=$1", [draft.id])).rows.length, 0);
    await db.exec("set role service_role");
    const pending = (await db.query<{ value: { id: string } }>("select public.create_credential_draft($1,$2,$3,'COURSE_CERTIFICATE','COURSE','Pending Org',null,current_date,null,null) value", [outsider, secondOrg, candidate])).rows[0].value;
    await db.query("select public.transition_credential($1,$2,'submit',null)", [outsider, pending.id]);
    await assert.rejects(db.query("select public.transition_credential($1,$2,'issue',null)", [outsider, pending.id]), /Verified organization required/);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [viewer]);
    assert.equal((await db.query("select id from public.credentials where id=$1", [draft.id])).rows.length, 1);
    assert.equal((await db.query("update public.credentials set title='Forbidden' where id=$1 returning id", [draft.id])).rows.length, 0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
    await db.query("insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000001',$1,'VIEWER')", [candidate]);
    assert.equal((await db.query("select id from public.organization_members where user_id=$1", [candidate])).rows.length, 1);
  } finally { await db.close(); }
});
