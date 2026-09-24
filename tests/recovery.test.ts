import assert from "node:assert/strict";
import test from "node:test";
import { requestRecovery, resetPassword } from "../src/lib/auth/recovery";
import { verifiedUser } from "../src/lib/auth/service";
import { authFixture } from "./helpers/auth-fixture";
import { recoveryProofFromUrl, recoveryOrigin } from "../src/lib/auth/recovery-link";

const input = { password: "a-unique-long-passphrase-2026", confirmPassword: "a-unique-long-passphrase-2026" };
test("password recovery validates email and fixes the reset destination without revealing account existence", async () => {
  const fixture = authFixture();
  assert.ok((await requestRecovery(fixture.server().auth, { email: "invalid" }, "https://certs.example.com")).errors?.email);
  assert.equal(fixture.requests.length, 0);
  const result = await requestRecovery(fixture.server().auth, { email: "member@example.com", next: "https://attacker.example" }, "https://certs.example.com");
  assert.equal(result.status, "success");
  assert.match(result.message!, /If this email is eligible/);
  assert.equal(result.retryAfterSeconds, 90);
  assert.equal(fixture.requests.find((r) => r.path.endsWith("/recover"))?.redirectTo, "https://certs.example.com/reset-password");
  assert.equal(await verifiedUser(fixture.server().auth), null);
});
test("recovery verifies a recovery token before updating password and signs out afterward", async () => {
  const fixture = authFixture();
  const result = await resetPassword(fixture.server().auth, input, { kind: "token", value: "valid-token" });
  assert.equal(result.status, "success");
  assert.equal(result.message, "Password updated successfully. You can now sign in.");
  const verify = fixture.requests.findIndex((r) => r.path.endsWith("/verify"));
  const update = fixture.requests.findIndex((r) => r.path.endsWith("/user") && r.body.password);
  assert.ok(verify >= 0 && update > verify);
  assert.equal(fixture.requests[verify].body.type, "recovery");
  assert.equal(fixture.requests[update].body.password, input.password);
  assert.equal(await verifiedUser(fixture.server().auth), null);
  assert.ok(fixture.requests.some((r) => r.path.endsWith("/logout")));
  const updatesBeforeReplay = fixture.requests.filter((r) => r.path.endsWith("/user") && r.body.password).length;
  assert.equal((await resetPassword(fixture.server().auth, input, { kind: "token", value: "valid-token" })).code, "INVALID_RECOVERY");
  assert.equal(fixture.requests.filter((r) => r.path.endsWith("/user") && r.body.password).length, updatesBeforeReplay);
});

test("eight-character passwords succeed and seven-character passwords fail before token exchange", async () => {
  const fixture = authFixture();
  const auth = fixture.server().auth;
  const proof = { kind: "token", value: "valid-token" };
  assert.equal((await resetPassword(auth, { password: "1234567", confirmPassword: "1234567" }, proof)).status, "error");
  assert.equal(fixture.requests.length, 0);
  assert.equal((await resetPassword(auth, { password: "12345678", confirmPassword: "12345678" }, proof)).status, "success");
});

test("PKCE recovery exchanges the code using the requesting browser's verifier", async () => {
  const fixture = authFixture();
  const auth = fixture.server().auth;
  await requestRecovery(auth, { email: "member@example.com" }, "http://localhost:3000");
  const result = await resetPassword(auth, input, { kind: "code", value: "valid-code" });
  assert.equal(result.status, "success");
  assert.ok(fixture.requests.some((r) => r.grant === "pkce"));
  assert.ok(fixture.requests.some((r) => r.body.password === input.password));
});

test("an ordinary signup PKCE flow cannot authorize a password reset", async () => {
  const fixture = authFixture();
  const auth = fixture.server().auth;
  await auth.signUp({ email: "member@example.com", password: input.password });
  const result = await resetPassword(auth, input, { kind: "code", value: "valid-code" });
  assert.equal(result.code, "INVALID_RECOVERY");
  assert.ok(!fixture.requests.some((r) => r.path.endsWith("/user") && r.body.password));
});

test("reset URLs reject missing, duplicate, mixed and non-recovery proof", () => {
  for (const params of [{}, { code: ["a", "b"] }, { code: "a", token_hash: "b" }, { token_hash: "a", type: "signup" }, { code: "a", error: "expired" }]) assert.equal(recoveryProofFromUrl(params), null);
  assert.deepEqual(recoveryProofFromUrl({ code: "recovery-code" }), { kind: "code", value: "recovery-code", flowId: undefined });
  assert.equal(recoveryOrigin("https://certs.uzyntra.com", true), "http://localhost:3000");
  assert.equal(recoveryOrigin("https://certs.uzyntra.com", false), "https://certs.uzyntra.com");
});

test("network errors and missing recovery sessions have actionable messages and never update passwords", async () => {
  const fixture = authFixture();
  const base = fixture.server().auth;
  const networkAuth = { resetPasswordForEmail: base.resetPasswordForEmail.bind(base), exchangeCodeForSession: base.exchangeCodeForSession.bind(base), updateUser: base.updateUser.bind(base), signOut: base.signOut.bind(base), verifyOtp: async () => { throw new TypeError("fetch failed"); } };
  const result = await resetPassword(networkAuth, input, { kind: "token", value: "token" });
  assert.match(result.message!, /connection/);
  const missing = await resetPassword(base, input, { kind: "code", value: "valid-code" });
  assert.equal(missing.code, "MISSING_RECOVERY_SESSION");
  assert.equal(fixture.requests.filter((r) => r.body.password === input.password).length, 0);
});
test("invalid, expired, missing reset tokens never update a password, even with an existing session", async () => {
  for (const token of ["expired", "", null]) {
    const fixture = authFixture();
    await fixture.server().auth.signInWithPassword({ email: "member@example.com", password: "correct-password-123" });
    const result = await resetPassword(fixture.server().auth, input, { kind: "token", value: token });
    assert.equal(result.code, "INVALID_RECOVERY");
    assert.ok(!fixture.requests.some((r) => r.path.endsWith("/user") && r.body.password));
  }
});
test("weak passwords and mismatched confirmation do not consume reset tokens", async () => {
  for (const data of [{ password: "short", confirmPassword: "short" }, { ...input, confirmPassword: "different" }]) {
    const fixture = authFixture();
    const result = await resetPassword(fixture.server().auth, data, { kind: "token", value: "valid-token" });
    assert.equal(result.status, "error");
    assert.ok(result.errors);
    assert.equal(fixture.requests.length, 0);
  }
});
