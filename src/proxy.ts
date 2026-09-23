import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { contentSecurityPolicy } from "@/lib/security/csp";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = await updateSession(request, headers);
  response.headers.set("Content-Security-Policy", csp);
  // Never share session-bearing HTML or per-request nonces through a CDN.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_vercel/speed-insights/|badges/|favicon.ico|icon.svg|api/health).*)"],
};
