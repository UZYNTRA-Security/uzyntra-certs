import { getSiteUrl } from "@/lib/metadata";

type CertificatePdfInput = {
  credential_id: string;
  title: string;
  credential_type: string;
  category: string;
  holder: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  certificate_slug: string;
  badges: Array<{ name: string; level: string | null }>;
};

const esc = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
const line = (value: string, max = 72) => value.length > max ? `${value.slice(0, max - 1)}...` : value;

export function renderCertificatePdf(credential: CertificatePdfInput) {
  const verifyUrl = new URL(`/v/${credential.credential_id}`, getSiteUrl()).toString();
  const certificateUrl = new URL(`/certificate/${credential.credential_id}`, getSiteUrl()).toString();
  const badge = credential.badges[0];
  const content = [
    "q",
    "0.07 0.09 0.12 rg 0 0 842 595 re f",
    "0.42 0.87 0.63 RG 3 w 28 28 786 539 re S",
    "0.42 0.87 0.63 rg 52 520 220 4 re f",
    "0.42 0.87 0.63 rg 570 520 220 4 re f",
    "BT /F1 18 Tf 0.42 0.87 0.63 rg 52 492 Td (UZYNTRA CERTS) Tj ET",
    "BT /F2 42 Tf 0.96 0.97 0.98 rg 52 430 Td (Certificate of Verification) Tj ET",
    `BT /F1 16 Tf 0.68 0.71 0.75 rg 54 394 Td (This certifies that) Tj ET`,
    `BT /F2 34 Tf 0.96 0.97 0.98 rg 54 345 Td (${esc(line(credential.holder, 42))}) Tj ET`,
    `BT /F1 16 Tf 0.68 0.71 0.75 rg 54 310 Td (has earned) Tj ET`,
    `BT /F2 26 Tf 0.42 0.87 0.63 rg 54 270 Td (${esc(line(credential.title, 54))}) Tj ET`,
    `BT /F1 13 Tf 0.78 0.81 0.84 rg 54 236 Td (Issued by ${esc(line(credential.issuer, 60))}) Tj ET`,
    `BT /F1 12 Tf 0.78 0.81 0.84 rg 54 206 Td (Credential type: ${esc(credential.credential_type.replaceAll("_", " "))}) Tj ET`,
    `BT /F1 12 Tf 0.78 0.81 0.84 rg 54 184 Td (Issue date: ${esc(credential.issue_date)}${credential.expiry_date ? `    Expiry date: ${esc(credential.expiry_date)}` : "    Expiry date: No expiry"}) Tj ET`,
    `BT /F1 12 Tf 0.78 0.81 0.84 rg 54 162 Td (Credential ID: ${esc(credential.credential_id)}) Tj ET`,
    `BT /F1 12 Tf 0.78 0.81 0.84 rg 54 140 Td (Certificate slug: ${esc(credential.certificate_slug)}) Tj ET`,
    badge ? `BT /F1 12 Tf 0.42 0.87 0.63 rg 54 118 Td (Badge: ${esc(line(badge.name, 70))}${badge.level ? ` / ${esc(line(badge.level, 24))}` : ""}) Tj ET` : "",
    "0.42 0.87 0.63 RG 1 w 600 330 120 120 re S",
    "0.42 0.87 0.63 rg 616 408 88 8 re f 616 388 88 8 re f 616 368 88 8 re f",
    "BT /F1 11 Tf 0.68 0.71 0.75 rg 590 298 Td (Scan QR on web certificate) Tj ET",
    `BT /F1 9 Tf 0.78 0.81 0.84 rg 520 274 Td (${esc(line(verifyUrl, 76))}) Tj ET`,
    "0.42 0.87 0.63 RG 1 w 54 84 230 1 re S 560 84 180 1 re S",
    "BT /F1 10 Tf 0.68 0.71 0.75 rg 54 64 Td (Authorized UZYNTRA Certs Record) Tj ET",
    "BT /F1 10 Tf 0.68 0.71 0.75 rg 560 64 Td (Verification Signature) Tj ET",
    `BT /F1 9 Tf 0.55 0.59 0.64 rg 54 42 Td (View online: ${esc(line(certificateUrl, 82))}) Tj ET`,
    "Q",
  ].filter(Boolean).join("\n");

  return buildPdf(content);
}

function buildPdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
