import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { contentSecurityPolicy } from "@/lib/security/csp";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  // Public shell pages have no user data and must not depend on Auth uptime.
  // Future protected routes must explicitly opt in here AND enforce guards/RLS.
  const path = request.nextUrl.pathname;
  const response = path.startsWith("/auth/") || path === "/dashboard" || path.startsWith("/dashboard/") || path === "/issuer" || path.startsWith("/issuer/") || path === "/admin" || path.startsWith("/admin/") || path === "/login" || path === "/register" || path === "/forgot-password" || path === "/reset-password"
    ? await updateSession(request, headers)
    : NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  // Never share session-bearing HTML or per-request nonces through a CDN.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (process.env.VERCEL_ENV !== "production" || ["/login", "/register", "/forgot-password", "/reset-password", "/verify", "/dashboard", "/issuer", "/admin"].includes(path) || path.startsWith("/dashboard/") || path.startsWith("/issuer/") || path.startsWith("/admin/") || path.startsWith("/auth/") || path.startsWith("/v/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static/|_next/image|_vercel/speed-insights/|badges/|favicon\\.ico$|icon\\.svg$|apple-icon\\.png$|robots\\.txt$|sitemap\\.xml$|api/health$).*)"],
};
