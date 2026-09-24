import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { login, register, logout, verifiedUser, completeCallback, resendConfirmation, confirmationMessage, alreadyRegisteredMessage } from "../src/lib/auth/service";
import { updateSession } from "../src/lib/supabase/proxy";
import { authFixture } from "./helpers/auth-fixture";

const credentials = { email: "member@example.com", password: "correct-password-123" };

test("confirmation resend validates email and uses only the configured callback", async () => {
  const fixture = authFixture();
  const auth = fixture.server().auth;
  const invalid = await resendConfirmation(auth, { email: "invalid" }, "https://certs.example.com");
  assert.ok(invalid.errors?.email);
  assert.equal(fixture.requests.length, 0);
  const result = await resendConfirmation(auth, { email: credentials.email, next: "https://attacker.example" }, "https://certs.example.com");
  assert.equal(result.status, "success");
  assert.equal(result.retryAfterSeconds, 90);
  const request = fixture.requests.find(({ path }) => path.endsWith("/resend"));
  assert.equal(request?.body.type, "signup");
  assert.equal(request?.body.email, credentials.email);
  assert.equal(request?.redirectTo, "https://certs.example.com/auth/callback");
  // Resending may store a PKCE verifier, but must not authenticate the user.
  assert.equal(await verifiedUser(auth), null);
});

test("rate-limited resends show a cooldown without claiming an email was sent", async () => {
  const fixture = authFixture({ resendError: { code: "over_email_send_rate_limit", status: 429 } });
  const result = await resendConfirmation(fixture.server().auth, credentials, "https://certs.example.com");
  assert.equal(result.status, "error");
  assert.equal(result.retryAfterSeconds, 90);
  assert.match(result.message ?? "", /90 seconds/);
  assert.doesNotMatch(result.message ?? "", /Provider details/);
});

test("provider duplicate-account responses show the explicit registered message", async () => {
  const fixture = authFixture({ signupError: { code: "user_already_exists", status: 422 } });
  const result = await register(fixture.server().auth, { ...credentials, confirmPassword: credentials.password }, "https://certs.example.com", async () => "new");
  assert.ok("state" in result);
  assert.equal(result.state.message, alreadyRegisteredMessage);
  assert.equal(result.state.code, "EMAIL_ALREADY_REGISTERED");
  assert.equal(result.state.email, credentials.email);
  assert.equal(result.state.status, "error");
});

test("resend does not disclose whether an email is registered or confirmed", async () => {
  for (const code of ["user_not_found", "email_already_confirmed"]) {
    const fixture = authFixture({ resendError: { code, status: 422 } });
    const result = await resendConfirmation(fixture.server().auth, credentials, "https://certs.example.com");
    assert.equal(result.message, confirmationMessage);
    assert.equal(result.status, "success");
  }
});

test("unauthenticated sessions have no verified user", async () => {
  const fixture = authFixture();
  assert.equal(await verifiedUser(fixture.server().auth), null);
  assert.equal(fixture.requests.length, 0);
});

test("unauthenticated dashboard requests redirect before rendering", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const request = new NextRequest("https://certs.example.com/dashboard");
    const response = await updateSession(request, new Headers(request.headers));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://certs.example.com/login");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});

test("login creates a secure cookie session readable by a fresh server client", async () => {
  const fixture = authFixture();
  assert.deepEqual(await login(fixture.server().auth, credentials), { redirect: "/dashboard" });
  assert.ok(fixture.writes.some(({ value, options }) => value && options.secure && options.sameSite === "lax"));
  assert.match(fixture.cacheHeaders["Cache-Control"], /no-store/);
  assert.equal((await verifiedUser(fixture.server().auth))?.id, fixture.user.id);
});

test("browser and server clients share the same session cookies", async () => {
  const fixture = authFixture();
  assert.deepEqual(await login(fixture.browser().auth, credentials), { redirect: "/dashboard" });
  assert.equal((await verifiedUser(fixture.server().auth))?.id, fixture.user.id);
});

test("logout clears cookies and removes access on the next request", async () => {
  const fixture = authFixture();
  await login(fixture.server().auth, credentials);
  assert.deepEqual(await logout(fixture.server().auth), { redirect: "/login" });
  assert.equal(await verifiedUser(fixture.server().auth), null);
  assert.ok(fixture.writes.some(({ value, options }) => value === "" && options.maxAge === 0));
  assert.ok(fixture.requests.some(({ path }) => path.endsWith("/logout")));
});

test("invalid credentials and unconfirmed users cannot enter the dashboard", async () => {
  const fixture = authFixture();
  const bad = await login(fixture.server().auth, { ...credentials, password: "wrong" });
  assert.ok("state" in bad && bad.state.status === "error");
  assert.equal(fixture.jar.size, 0);
  const unconfirmed = authFixture({ confirmed: false });
  assert.ok("state" in await login(unconfirmed.server().auth, credentials));
  assert.equal(await verifiedUser(unconfirmed.server().auth), null);
});

test("registration validates fields before contacting Auth and awaits verification", async () => {
  const fixture = authFixture();
  const invalid = await register(fixture.server().auth, { ...credentials, confirmPassword: "different" }, "https://certs.example.com", async () => { throw new Error("Must not query invalid input"); });
  assert.ok("state" in invalid && invalid.state.errors?.confirmPassword);
  assert.equal(fixture.requests.length, 0);
  const result = await register(fixture.server().auth, { ...credentials, confirmPassword: credentials.password }, "https://certs.example.com", async () => "new");
  assert.ok("state" in result && result.state.status === "success");
  assert.equal(await verifiedUser(fixture.server().auth), null);
});

test("PKCE callback creates a session and ignores untrusted redirect targets", async () => {
  const fixture = authFixture();
  await register(fixture.server().auth, { ...credentials, confirmPassword: credentials.password }, "https://certs.example.com", async () => "new");
  assert.equal(await completeCallback(fixture.server().auth, new URLSearchParams("code=valid-code&next=https://attacker.example")), "/dashboard");
  assert.equal((await verifiedUser(fixture.server().auth))?.id, fixture.user.id);
});

test("email token callback supports confirmation without a PKCE cookie", async () => {
  const fixture = authFixture();
  assert.equal(await completeCallback(fixture.server().auth, new URLSearchParams("token_hash=valid-token&type=email")), "/dashboard");
  assert.equal((await verifiedUser(fixture.server().auth))?.id, fixture.user.id);
});

test("invalid, expired, ambiguous, and unsupported callbacks fail closed", async () => {
  for (const params of ["", "code=expired", "token_hash=expired&type=email", "token_hash=valid-token&type=recovery", "code=valid-code&token_hash=valid-token", "code=valid-code&code=other", "error=access_denied&code=valid-code"]) {
    const fixture = authFixture();
    assert.equal(await completeCallback(fixture.server().auth, new URLSearchParams(params)), "/auth/error", params);
    assert.equal(await verifiedUser(fixture.server().auth), null);
  }
});

test("proxy refresh forwards new cookies to both downstream requests and the browser", async () => {
  const fixture = authFixture({ expired: true });
  await login(fixture.server().auth, credentials);
  const previousFetch = globalThis.fetch;
  const keys = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const;
  const previous = keys.map((key) => process.env[key]);
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://certs.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_fixture";
    globalThis.fetch = fixture.fetcher;
    const request = new NextRequest("https://certs.example.com/dashboard", { headers: { cookie: [...fixture.jar].map(([name, value]) => name + "=" + value).join("; ") } });
    const response = await updateSession(request, new Headers(request.headers));
    assert.ok(fixture.requests.some(({ grant }) => grant === "refresh_token"));
    assert.ok(response.cookies.getAll().some(({ name }) => name.includes("auth-token")));
    assert.ok(response.headers.get("x-middleware-request-cookie"));
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  } finally {
    globalThis.fetch = previousFetch;
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
