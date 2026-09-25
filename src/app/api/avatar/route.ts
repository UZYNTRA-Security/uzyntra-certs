import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameSchema } from "@/lib/candidate/schema";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username");
    let path: string | null = null;
    if (username !== null) {
      const parsed = usernameSchema.safeParse(username);
      if (!parsed.success) return new Response(null, { status: 404, headers });
      const { data, error } = await createAdminClient().from("profiles").select("avatar_url").eq("username", parsed.data).eq("visibility", "public").maybeSingle();
      if (error) throw error;
      path = data?.avatar_url || null;
    } else {
      const user = await getCurrentUser();
      if (!user) return new Response(null, { status: 401, headers });
      const { data, error } = await (await createClient()).from("profiles").select("avatar_url").eq("id", user.id).single();
      if (error) throw error;
      path = data.avatar_url;
    }
    if (!path) return new Response(null, { status: 404, headers });
    const { data, error } = await createAdminClient().storage.from("avatars").download(path);
    if (error || !data) return new Response(null, { status: 404, headers });
    return new Response(await data.arrayBuffer(), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return new Response(null, { status: 503, headers }); }
}
