import assert from "node:assert/strict";
import test from "node:test";
import { exchangeRecovery, requestRecovery, updateRecoveredPassword } from "../src/lib/auth/recovery";
import { issueRecoveryGrant, validRecoveryGrant } from "../src/lib/auth/recovery-grant";
import { authFixture } from "./helpers/auth-fixture";

test("callback exchanges valid recovery code before password update and preserves the session", async () => {
  const fixture = authFixture();
  const auth = fixture.server().auth;
  await requestRecovery(auth, { email: "member@example.com" }, "https://certs.example.com");
  const result = await exchangeRecovery(auth, { kind: "code", value: "valid-code" });
  assert.ok(result.ok);
  const fresh = fixture.server().auth;
  assert.equal((await fresh.getUser()).data.user?.id, fixture.user.id);
  assert.ok(!fixture.requests.some((r) => r.path.endsWith("/user") && r.body.password));
  const grant = issueRecoveryGrant(result.session.user.id, result.session.access_token, "test-server-secret");
  assert.ok(validRecoveryGrant(grant, result.session.user.id, result.session.access_token, "test-server-secret"));
  const updated = await updateRecoveredPassword(fresh, { password: "new-password-123", confirmPassword: "new-password-123" });
  assert.equal(updated.status, "success");
  assert.equal(updated.message, "Password updated successfully. You can now sign in.");
  assert.equal((await fresh.getUser()).data.user, null);
});

test("missing and expired codes never create a recovery session", async () => {
  for (const proof of [undefined, { kind: "code", value: "" }, { kind: "code", value: "expired-code" }]) {
    const fixture = authFixture();
    await requestRecovery(fixture.server().auth, { email: "member@example.com" }, "https://certs.example.com");
    const result = await exchangeRecovery(fixture.server().auth, proof);
    assert.equal(result.ok, false);
    assert.equal((await fixture.server().auth.getUser()).data.user, null);
  }
});

test("recovery grants reject missing, expired, forged and different-user/session proofs", () => {
  const grant = issueRecoveryGrant("user-a", "session-a", "secret", 1000);
  assert.ok(validRecoveryGrant(grant, "user-a", "session-a", "secret", 2000));
  assert.equal(validRecoveryGrant(undefined, "user-a", "session-a", "secret", 2000), false);
  assert.equal(validRecoveryGrant(grant, "user-b", "session-a", "secret", 2000), false);
  assert.equal(validRecoveryGrant(grant, "user-a", "session-b", "secret", 2000), false);
  assert.equal(validRecoveryGrant(grant, "user-a", "session-a", "wrong-secret", 2000), false);
  assert.equal(validRecoveryGrant(grant, "user-a", "session-a", "secret", 601000), false);
  assert.equal(validRecoveryGrant(grant + ".extra", "user-a", "session-a", "secret", 2000), false);
});
