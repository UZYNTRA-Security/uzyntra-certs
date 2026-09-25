import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv, hasSupabaseConfig } from "@/lib/env/public";
import type { Database } from "@/types/database";
import { verifiedUser } from "@/lib/auth/service";

export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const protectedRoute = request.nextUrl.pathname === "/dashboard" || request.nextUrl.pathname.startsWith("/dashboard/") || request.nextUrl.pathname === "/issuer" || request.nextUrl.pathname.startsWith("/issuer/") || request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const loginRedirect = () => NextResponse.redirect(new URL("/login", request.url), 307);
  if (!hasSupabaseConfig()) return protectedRoute ? loginRedirect() : response;

  const env = getPublicEnv();
  const cacheHeaders = new Headers();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request: { headers: requestHeaders } });
        Object.entries(headersToSet).forEach(([name, value]) => cacheHeaders.set(name, value));
        cacheHeaders.forEach((value, name) => response.headers.set(name, value));
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refresh and validate; authorization remains in guards and database RLS.
  await supabase.auth.getClaims();
  if (protectedRoute) {
    let replacement: NextResponse | undefined;
    try {
      if (!await verifiedUser(supabase.auth)) replacement = loginRedirect();
    } catch {
      replacement = NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
    }
    if (replacement) {
      response.cookies.getAll().forEach((cookie) => replacement!.cookies.set(cookie));
      cacheHeaders.forEach((value, name) => replacement!.headers.set(name, value));
      return replacement;
    }
  }
  return response;
}
