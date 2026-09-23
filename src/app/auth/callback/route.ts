import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/metadata";
import { completeCallback } from "@/lib/auth/service";

export async function GET(request: NextRequest) {
  let destination: "/dashboard" | "/auth/error" = "/auth/error";
  try {
    const supabase = await createClient("write");
    destination = await completeCallback(supabase.auth, request.nextUrl.searchParams);
  } catch {
    // Never expose authorization codes, tokens, or provider errors.
  }
  return NextResponse.redirect(new URL(destination, getSiteUrl()), {
    status: 303,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
