import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { register, alreadyRegisteredMessage } from "../src/lib/auth/service";
import { authFixture } from "./helpers/auth-fixture";

test("registration lookup uses PostgreSQL Auth data with service-only permissions", async () => {
  const db = new PGlite();
  try {
    // Reproduce the relevant Supabase roles and Auth table inside an isolated DB.
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users (email text, email_confirmed_at timestamptz);
      insert into auth.users values ('member@example.com', now()), ('pending@example.com', null);
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20260924000000_registration_email_lookup.sql", import.meta.url), "utf8"));
    for (const role of ["anon", "authenticated"]) {
      const result = await db.query<{ allowed: boolean }>("select has_function_privilege($1, 'public.is_email_registered(text)', 'execute') as allowed", [role]);
      assert.equal(result.rows[0].allowed, false, role);
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select public.is_email_registered('member@example.com')"), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const lookup = async (email: string) => (await db.query<{ present: boolean }>("select public.is_email_registered($1) as present", [email])).rows[0].present;
    assert.equal(await lookup(" MEMBER@EXAMPLE.COM "), true);
    assert.equal(await lookup("pending@example.com"), true);
    assert.equal(await lookup("new@example.com"), false);

    for (const email of ["MEMBER@example.com", "pending@example.com"]) {
      const fixture = authFixture();
      const result = await register(fixture.server().auth, { email, password: "correct-password-123", confirmPassword: "correct-password-123" }, "https://certs.example.com", lookup);
      assert.ok("state" in result);
      assert.equal(result.state.message, alreadyRegisteredMessage);
      assert.equal(result.state.code, "EMAIL_ALREADY_REGISTERED");
      assert.equal(fixture.requests.length, 0, "Existing accounts must not trigger Auth/signup or email requests");
    }
    const fixture = authFixture();
    const result = await register(fixture.server().auth, { email: "new@example.com", password: "correct-password-123", confirmPassword: "correct-password-123" }, "https://certs.example.com", lookup);
    assert.ok("state" in result && result.state.status === "success");
    assert.equal(fixture.requests.filter(({ path }) => path.endsWith("/signup")).length, 1);
  } finally { await db.close(); }
});

test("database lookup failures never fall back to sending a signup email", async () => {
  const fixture = authFixture();
  const result = await register(fixture.server().auth, { email: "member@example.com", password: "correct-password-123", confirmPassword: "correct-password-123" }, "https://certs.example.com", async () => { throw new Error("Database unavailable with internal details"); });
  assert.ok("state" in result && result.state.status === "error");
  assert.doesNotMatch(result.state.message ?? "", /internal details/);
  assert.equal(fixture.requests.length, 0);
});
