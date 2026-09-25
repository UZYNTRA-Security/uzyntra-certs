import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCertificateCredential } from "@/lib/certificate/data";
import { renderCertificatePdf } from "@/lib/certificate/pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ credential_id: string }> }) {
  const credential = await getCertificateCredential((await params).credential_id, "owner");
  if (!credential) return new Response(null, { status: 404 });
  const objectPath = `${credential.credential_id}/certificate.pdf`;
  const admin = createAdminClient();
  const pdf = renderCertificatePdf(credential);
  await admin.storage.from("certificates").upload(objectPath, pdf, { contentType: "application/pdf", cacheControl: "3600", upsert: true });
  await admin.from("credentials").update({ certificate_file_url: `certificates/${objectPath}` }).eq("id", credential.id);
  return new NextResponse(new Uint8Array(pdf), { headers: headers(credential.credential_id) });
}

function headers(id: string) {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${id}-certificate.pdf"`,
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
  };
}
