import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { verificationResultSchema } from "../src/lib/verification/schema";

test("credential migrations enforce ownership, private publication, exact lookup, status, logs and rate limits", async () => {
  const db = new PGlite();
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  const id = "UZY-CERT-2026-A82KD";
  const hash = "a".repeat(64);
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to authenticated;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      insert into auth.users values ('${alice}', 'alice@example.com', now());`);
    const migrations = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(migrations)).filter((f) => f.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, migrations), "utf8"));
    await db.exec(`insert into auth.users values ('${bob}', 'bob@example.com', now());`);
    assert.equal((await db.query("select * from public.profiles")).rows.length, 2, "backfill and new-user trigger");
    await db.exec(`insert into public.credentials(credential_id, owner_id, credential_type, title, issue_date, public_holder_name, certificate_file_url)
      values ('${id}', '${alice}', 'COURSE_CERTIFICATE', 'Security Engineering', current_date, 'Alice Approved', 'private/secret.pdf');
      insert into public.badges(name,slug,category,icon_url) values ('Security','security','SECURITY','/badges/cybersecurity.png');
      insert into public.credential_badges select c.id,b.id from public.credentials c cross join public.badges b;`);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select public.verify_public_credential($1,$2)", [id, hash]), /permission denied/);
      await assert.rejects(db.query("select * from public.verification_logs"), /permission denied/);
      await assert.rejects(db.query("select * from public.verification_rate_limits"), /permission denied/);
      assert.equal((await db.query("select * from public.badges")).rows.length, 1);
      await db.exec("reset role");
    }
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.profiles"), /permission denied/);
    await assert.rejects(db.query("select * from public.credentials"), /permission denied/);
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
    assert.equal((await db.query("select * from public.credentials")).rows.length, 1);
    assert.equal((await db.query("select * from public.credential_badges")).rows.length, 1);
    await db.query("update public.profiles set full_name='User edited name' where id=$1", [alice]);
    assert.equal((await db.query("update public.profiles set full_name='Attack' where id=$1 returning id", [bob])).rows.length, 0);
    await assert.rejects(db.query("update public.profiles set id=$1", [bob]), /permission denied/);
    await assert.rejects(db.query("update public.credentials set status='ACTIVE'"), /permission denied/);
    await assert.rejects(db.query("delete from public.credentials"), /permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
    assert.equal((await db.query("select * from public.credentials")).rows.length, 0);
    assert.equal((await db.query("select * from public.credential_badges")).rows.length, 0);
    await db.exec("reset role; set role service_role");
    const lookup = async (requested = id, key = hash) => verificationResultSchema.parse((await db.query<{ result: unknown }>("select public.verify_public_credential($1,$2) as result", [requested, key])).rows[0].result);
    assert.equal((await lookup()).outcome, "not_found", "private credential indistinguishable from missing");
    await db.exec(`update public.credentials set public_visible=true`);
    const found = await lookup();
    assert.equal(found.outcome, "found");
    if (found.outcome !== "found") throw new Error("Expected published credential");
    assert.equal(found.credential.holder_name, "Alice Approved");
    assert.equal(found.credential.badges.length, 1);
    const raw = JSON.stringify((await db.query("select public.verify_public_credential($1,$2)", [id, hash])).rows);
    for (const privateField of ["owner_id", "email", "certificate_file_url", "verification_hash", "private/secret", "User edited name"]) assert.ok(!raw.includes(privateField), privateField);
    for (const status of ["REVOKED", "SUSPENDED", "EXPIRED"]) {
      await db.query("update public.credentials set status=$1::public.credential_status", [status]);
      const value = await lookup(); assert.ok(value.outcome === "found" && value.credential.status === status);
    }
    await db.exec("update public.credentials set status='ACTIVE', issue_date=current_date-2, expiry_date=current_date-1");
    let value = await lookup(); assert.ok(value.outcome === "found" && value.credential.status === "EXPIRED");
    await db.exec("update public.credentials set expiry_date=null, issue_date=current_date+1");
    value = await lookup(); assert.ok(value.outcome === "found" && value.credential.status === "NOT_YET_VALID");
    assert.equal((await lookup("UZY-CERT-2026-NOMATCH")).outcome, "not_found");
    assert.equal((await lookup("%" )).outcome, "not_found");
    const limitHash = "b".repeat(64);
    for (let i = 0; i < 30; i++) assert.notEqual((await lookup(id, limitHash)).outcome, "rate_limited");
    assert.equal((await lookup(id, limitHash)).outcome, "rate_limited");
    await db.query("update public.verification_rate_limits set window_start=now()-interval '2 minutes' where requester_hash=$1", [limitHash]);
    assert.equal((await lookup(id, limitHash)).outcome, "found");
    const logs = await db.query<{ ip_address: null }>("select ip_address from public.verification_logs");
    assert.ok(logs.rows.length > 0 && logs.rows.every((l) => l.ip_address === null));
    await db.exec("update public.verification_logs set verified_at=now()-interval '31 days'; select public.prune_verification_activity()");
    assert.equal((await db.query("select * from public.verification_logs")).rows.length, 0);
  } finally { await db.close(); }
});
