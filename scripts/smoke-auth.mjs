import assert from "node:assert/strict";

// Run against a running app. No credentials are sent and no users are created.
const base = process.env.AUTH_SMOKE_BASE_URL || "http://127.0.0.1:3100";
const request = (path) => fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(15000) });

const dashboard = await request("/dashboard");
assert.equal(dashboard.status, 307, "Anonymous dashboard must redirect before streaming");
assert.equal(new URL(dashboard.headers.get("location"), base).pathname, "/login");
assert.match(dashboard.headers.get("cache-control"), /no-store/);
assert.ok(dashboard.headers.get("content-security-policy"));

const security = await request("/dashboard/security");
assert.equal(security.status, 307);
assert.equal(new URL(security.headers.get("location"), base).pathname, "/login");
for (const path of ["/forgot-password", "/auth/reset-password", "/verify"]) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get("content-security-policy"));
  assert.match(response.headers.get("cache-control"), /no-store/);
  if (path.startsWith("/auth/")) assert.equal(response.headers.get("referrer-policy"), "no-referrer");
}

for (const path of ["/login", "/register"]) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).includes('type="password"'));
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
}

const callback = await request("/auth/callback?next=https://attacker.example");
assert.equal(callback.status, 303);
const destination = new URL(callback.headers.get("location"));
assert.equal(destination.pathname, "/auth/error");
assert.notEqual(destination.hostname, "attacker.example");
assert.equal(destination.search, "");
assert.equal(callback.headers.get("referrer-policy"), "no-referrer");
assert.match(callback.headers.get("cache-control"), /no-store/);
console.log("Auth HTTP smoke checks passed: anonymous redirect, forms, callback failure, CSP, noindex, and no-store.");
