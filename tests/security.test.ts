import assert from "node:assert/strict";
import test from "node:test";
import { parsePublicEnv } from "../src/lib/env/schema";
import { contentSecurityPolicy } from "../src/lib/security/csp";
import { AppError, toPublicError } from "../src/lib/errors";

const validEnv = {
  NEXT_PUBLIC_SITE_URL: "https://certs.example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
};

test("public environment rejects privileged keys without printing their value", () => {
  assert.throws(() => parsePublicEnv({ ...validEnv, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_do_not_print" }), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(error.message, /sb_secret_do_not_print/);
    return true;
  });
});

test("production requires HTTPS and missing configuration fails closed", () => {
  assert.throws(() => parsePublicEnv({}, true));
  assert.throws(() => parsePublicEnv({ ...validEnv, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, true));
  assert.deepEqual(parsePublicEnv(validEnv, true), validEnv);
  assert.throws(() => parsePublicEnv({ ...validEnv, NEXT_PUBLIC_SUPABASE_URL: "javascript:alert(1)" }));
});

test("production CSP uses a nonce and disallows script eval and inline bypass", () => {
  const policy = contentSecurityPolicy("test-nonce", false, validEnv.NEXT_PUBLIC_SUPABASE_URL);
  const scripts = policy.split(";").find((entry) => entry.trim().startsWith("script-src"))!;
  assert.match(scripts, /'nonce-test-nonce'/);
  assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /connect-src 'self' https:\/\/project.supabase.co wss:\/\/project.supabase.co/);
});

test("unexpected errors do not leak internal details", () => {
  const error = toPublicError(new Error("database password: secret"));
  assert.equal(error.status, 500);
  assert.doesNotMatch(error.message, /password|secret/);
  assert.equal(toPublicError(new AppError("UNAUTHENTICATED", "Authentication is required.", 401)).status, 401);
});
