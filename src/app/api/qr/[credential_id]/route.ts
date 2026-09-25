import { createAdminClient } from "@/lib/supabase/admin";
import { credentialIdSchema } from "@/lib/verification/schema";
import { getSiteUrl } from "@/lib/metadata";
import { verificationQr } from "@/lib/qr";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ credential_id: string }> }) {
  const parsed = credentialIdSchema.safeParse((await params).credential_id);
  if (!parsed.success) return new Response(null, { status: 404 });
  try {
    const found = await createAdminClient().from("credentials").select("credential_id").eq("credential_id", parsed.data).eq("public_visible", true).in("status", ["ISSUED", "REVOKED", "EXPIRED"]).maybeSingle();
    if (found.error || !found.data) return new Response(null, { status: 404 });
    const png = await verificationQr(new URL(`/v/${parsed.data}`, getSiteUrl()).toString());
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(new Uint8Array(png), { headers: {
      "Content-Type": "image/png", "Content-Disposition": `${disposition}; filename="${parsed.data}-qr.png"`,
      "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return new Response(null, { status: 503 }); }
}
