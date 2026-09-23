import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// The real Supabase SDK and cookie codec run against an in-memory Auth transport.
// This fixture is test-only; production code never imports it.
export function authFixture({ confirmed = true, expired = false, resendError, signupError }: { confirmed?: boolean; expired?: boolean; resendError?: { code: string; status: number }; signupError?: { code: string; status: number } } = {}) {
  const jar = new Map<string, string>();
  const writes: { name: string; value: string; options: CookieOptions }[] = [];
  const cacheHeaders: Record<string, string> = {};
  const requests: { path: string; grant: string | null; redirectTo: string | null; body: Record<string, unknown> }[] = [];
  const user: User = {
    id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated",
    email: "member@example.com", email_confirmed_at: confirmed ? "2026-01-01T00:00:00Z" : undefined,
    app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z",
  };
  let active = true;
  let refreshed = false;
  const session = () => {
    const expiresIn = expired && !refreshed ? -10 : 3600;
    const payload = { sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + expiresIn, iat: Math.floor(Date.now() / 1000) };
    const access_token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify(payload)).toString("base64url"), Buffer.from("test-signature").toString("base64url")].join(".");
    return { access_token, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: expiresIn, user };
  };
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    requests.push({ path: url.pathname, grant: url.searchParams.get("grant_type"), redirectTo: url.searchParams.get("redirect_to"), body });
    if (url.pathname.endsWith("/token")) {
      if (url.searchParams.get("grant_type") === "password" && body.password !== "correct-password-123") return Response.json({ msg: "Invalid credentials", code: "invalid_credentials" }, { status: 400 });
      if (url.searchParams.get("grant_type") === "refresh_token") refreshed = true;
      if (url.searchParams.get("grant_type") === "pkce" && body.auth_code !== "valid-code") return Response.json({ msg: "Expired code" }, { status: 400 });
      active = true;
      return Response.json(session());
    }
    if (url.pathname.endsWith("/signup")) return signupError
      ? Response.json({ code: signupError.code, error_code: signupError.code, msg: "Provider details" }, { status: signupError.status })
      : Response.json({ ...user, email_confirmed_at: undefined, identities: [{ id: user.id, user_id: user.id, provider: "email" }] });
    if (url.pathname.endsWith("/resend")) return resendError
      ? Response.json({ code: resendError.code, error_code: resendError.code, msg: "Provider details" }, { status: resendError.status })
      : Response.json({});
    if (url.pathname.endsWith("/user")) return active ? Response.json(user) : Response.json({ msg: "Expired session" }, { status: 401 });
    if (url.pathname.endsWith("/logout")) { active = false; return new Response(null, { status: 204 }); }
    if (url.pathname.endsWith("/verify")) return body.token_hash === "valid-token" ? Response.json(session()) : Response.json({ msg: "Expired token" }, { status: 403 });
    throw new Error("Unexpected mock Auth endpoint");
  };
  const cookies = {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll(values: typeof writes, headers: Record<string, string> = {}) {
      Object.assign(cacheHeaders, headers);
      for (const cookie of values) {
        writes.push(cookie);
        if (!cookie.value || cookie.options.maxAge === 0) jar.delete(cookie.name);
        else jar.set(cookie.name, cookie.value);
      }
    },
  };
  const options = { cookies, cookieOptions: { path: "/", sameSite: "lax" as const, secure: true }, global: { fetch: fetcher } };
  return {
    jar, writes, cacheHeaders, requests, user, fetcher,
    server: () => createServerClient("https://auth.example.com", "sb_publishable_test_fixture", options),
    browser: () => createBrowserClient("https://auth.example.com", "sb_publishable_test_fixture", { ...options, isSingleton: false, auth: { autoRefreshToken: false } }),
  };
}
