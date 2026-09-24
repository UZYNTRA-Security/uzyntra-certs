import assert from "node:assert/strict";
import test from "node:test";
import { requestRecovery, resetPassword } from "../src/lib/auth/recovery";
import { verifiedUser } from "../src/lib/auth/service";
import { authFixture } from "./helpers/auth-fixture";

const input = { password: "a-unique-long-passphrase-2026", confirmPassword: "a-unique-long-passphrase-2026" };
test("password recovery validates email and fixes the reset destination without revealing account existence", async () => {
  const fixture = authFixture();
  assert.ok((await requestRecovery(fixture.server().auth, { email: "invalid" }, "https://certs.example.com")).errors?.email);
  assert.equal(fixture.requests.length, 0);
  const result = await requestRecovery(fixture.server().auth, { email: "member@example.com", next: "https://attacker.example" }, "https://certs.example.com");
  assert.equal(result.status, "success");
  assert.match(result.message!, /If this email is eligible/);
  assert.equal(result.retryAfterSeconds, 90);
  assert.equal(fixture.requests.find((r) => r.path.endsWith("/recover"))?.redirectTo, "https://certs.example.com/auth/reset-password");
  assert.equal(await verifiedUser(fixture.server().auth), null);
});
test("recovery verifies a recovery token before updating password and signs out afterward", async () => {
  const fixture = authFixture();
  const result = await resetPassword(fixture.server().auth, input, "valid-token");
  assert.equal(result.status, "success");
  const verify = fixture.requests.findIndex((r) => r.path.endsWith("/verify"));
  const update = fixture.requests.findIndex((r) => r.path.endsWith("/user") && r.body.password);
  assert.ok(verify >= 0 && update > verify);
  assert.equal(fixture.requests[verify].body.type, "recovery");
  assert.equal(fixture.requests[update].body.password, input.password);
  assert.equal(await verifiedUser(fixture.server().auth), null);
  assert.ok(fixture.requests.some((r) => r.path.endsWith("/logout")));
  const updatesBeforeReplay = fixture.requests.filter((r) => r.path.endsWith("/user") && r.body.password).length;
  assert.equal((await resetPassword(fixture.server().auth, input, "valid-token")).code, "INVALID_RECOVERY");
  assert.equal(fixture.requests.filter((r) => r.path.endsWith("/user") && r.body.password).length, updatesBeforeReplay);
});
test("invalid, expired, missing reset tokens never update a password, even with an existing session", async () => {
  for (const token of ["expired", "", null]) {
    const fixture = authFixture();
    await fixture.server().auth.signInWithPassword({ email: "member@example.com", password: "correct-password-123" });
    const result = await resetPassword(fixture.server().auth, input, token);
    assert.equal(result.code, "INVALID_RECOVERY");
    assert.ok(!fixture.requests.some((r) => r.path.endsWith("/user") && r.body.password));
  }
});
test("weak passwords and mismatched confirmation do not consume reset tokens", async () => {
  for (const data of [{ password: "short", confirmPassword: "short" }, { ...input, confirmPassword: "different" }, { password: "aaaaaaaaaaaaaaaa", confirmPassword: "aaaaaaaaaaaaaaaa" }]) {
    const fixture = authFixture();
    const result = await resetPassword(fixture.server().auth, data, "valid-token");
    assert.equal(result.status, "error");
    assert.ok(result.errors);
    assert.equal(fixture.requests.length, 0);
  }
});
