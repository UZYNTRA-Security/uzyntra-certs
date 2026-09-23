import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env/public";

export async function GET(request: NextRequest) {
  // Trusted configured origin and a fixed destination prevent open redirects.
  const origin = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  const code = request.nextUrl.searchParams.get("code");
  if (code && code.length <= 4096) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/", origin), { headers: { "Cache-Control": "no-store" } });
    } catch {
      // No provider details, authorization codes, or tokens in the response.
    }
  }
  return NextResponse.redirect(new URL("/auth/error", origin), { headers: { "Cache-Control": "no-store" } });
}
