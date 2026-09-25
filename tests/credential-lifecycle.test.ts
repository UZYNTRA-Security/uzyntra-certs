import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("credential lifecycle enforces issuer, reviewer, candidate and immutable audit permissions", async () => {
  const db=new PGlite();const candidate="11111111-1111-4111-8111-111111111111";const issuer="22222222-2222-4222-8222-222222222222";const reviewer="33333333-3333-4333-8333-333333333333";
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated;grant all on storage.objects,storage.buckets to service_role;insert into auth.users values('${candidate}','candidate@example.com',now()),('${issuer}','issuer@example.com',now()),('${reviewer}','reviewer@example.com',now());`);
    const dir=new URL("../supabase/migrations/",import.meta.url);for(const file of (await readdir(dir)).filter(f=>f.endsWith(".sql")).sort())await db.exec(await readFile(new URL(file,dir),"utf8"));
    await db.exec(`update public.profiles set full_name='Candidate Name' where id='${candidate}';insert into public.credential_issuers(user_id,role) values('${issuer}','ISSUER'),('${reviewer}','REVIEWER');insert into public.organization_members(organization_id,user_id,role) values('00000000-0000-4000-8000-000000000001','${issuer}','ISSUER'),('00000000-0000-4000-8000-000000000001','${reviewer}','REVIEWER');`);
    const issuerId=(await db.query<{id:string}>("select id from public.credential_issuers where user_id=$1",[issuer])).rows[0].id;
    await db.exec("set role authenticated");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[issuer]);
    const created=await db.query<{id:string;credential_id:string}>(`insert into public.credentials(owner_id,issuer_id,issuer_user_id,credential_type,category,title,issue_date) values($1,$2,$3,'COURSE_CERTIFICATE','COURSE','Secure Systems',current_date) returning id,credential_id`,[candidate,issuerId,issuer]);
    const credential=created.rows[0];assert.match(credential.credential_id,/^UZY-CERT-\d{4}-[A-F0-9]{32}$/);assert.equal((await db.query("select * from public.credentials")).rows.length,1);
    await assert.rejects(db.query("update public.credentials set status='ISSUED',public_visible=true,public_holder_name='Candidate Name',issued_at=now() where id=$1",[credential.id]),/Reviewer access required/);
    assert.equal((await db.query("update public.credentials set status='PENDING_REVIEW' where id=$1 returning id",[credential.id])).rows.length,1);
    await assert.rejects(db.query("insert into public.credential_events(credential_id,actor_user_id,event_type) values($1,$2,'CREATED')",[credential.id,issuer]),/permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[reviewer]);assert.equal((await db.query("select * from public.credentials where id=$1",[credential.id])).rows.length,1,"reviewer sees team queue");
    await db.query("update public.credentials set status='ISSUED',public_visible=true,public_holder_name='Candidate Name',issued_at=now() where id=$1",[credential.id]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[candidate]);const owned=await db.query<{status:string}>("select status from public.credentials");assert.deepEqual(owned.rows.map(r=>r.status),["ISSUED"]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[reviewer]);await db.query("update public.credentials set status='REVOKED',revoked_at=now(),revocation_reason='Credential issued in error' where id=$1",[credential.id]);
    await db.exec("reset role;set role service_role");await db.query("insert into public.credential_events(credential_id,actor_user_id,event_type,from_status,to_status) values($1,$2,'REVOKED','ISSUED','REVOKED')",[credential.id,reviewer]);await assert.rejects(db.query("update public.credential_events set details='{}'"),/immutable/);
    const atomic=(await db.query<{value:{id:string}}>("select public.create_credential_draft($1,$2,'COURSE_CERTIFICATE','COURSE','Atomic Credential',null,current_date,null,null) as value",[issuer,candidate])).rows[0].value;
    await db.query("select public.transition_credential($1,$2,'submit',null)",[issuer,atomic.id]);
    await db.query("select public.transition_credential($1,$2,'issue',null)",[reviewer,atomic.id]);
    await db.query("select public.transition_credential($1,$2,'revoke','Issued in error')",[reviewer,atomic.id]);
    assert.equal((await db.query("select * from public.credential_events where credential_id=$1",[atomic.id])).rows.length,4,"atomic actions always create audit events");
  }finally{await db.close()}
});
