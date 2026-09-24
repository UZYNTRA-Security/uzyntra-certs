import assert from "node:assert/strict";
import test from "node:test";
import { requesterHash } from "../src/lib/verification/requester";
import { credentialIdSchema } from "../src/lib/verification/schema";
test("verification normalizes exact IDs and rejects injection, paths, and incomplete IDs", () => {
  assert.equal(credentialIdSchema.parse(" uzy-cert-2026-a82kd "), "UZY-CERT-2026-A82KD");
  for (const value of ["%", "' or true --", "../../private", "UZY-CERT-2026", "x".repeat(200)]) assert.equal(credentialIdSchema.safeParse(value).success, false);
});
test("rate limit identity ignores untrusted forwarded headers and never stores raw IPs", () => {
  const a = new Headers({ "x-forwarded-for": "203.0.113.1" });
  const b = new Headers({ "x-forwarded-for": "203.0.113.2" });
  assert.equal(requesterHash(a, "test-secret", false), requesterHash(b, "test-secret", false));
  assert.notEqual(requesterHash(a, "test-secret", true), requesterHash(b, "test-secret", true));
  assert.match(requesterHash(a, "test-secret", true), /^[a-f0-9]{64}$/);
  assert.notEqual(requesterHash(a, "test-secret", true), requesterHash(a, "other-secret", true));
});
