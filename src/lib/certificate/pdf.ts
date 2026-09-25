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
const chunks = (value: string, size: number) => value.match(new RegExp(`.{1,${size}}`, "g")) ?? [value];

export function renderCertificatePdf(credential: CertificatePdfInput) {
  const verifyUrl = new URL(`/v/${credential.credential_id}`, getSiteUrl()).toString();
  const certificateUrl = new URL(`/certificate/${credential.credential_id}`, getSiteUrl()).toString();
  const badge = credential.badges[0];
  const credentialLines = chunks(credential.credential_id, 34);
  const certificateLines = chunks(certificateUrl, 68);
  const content = [
    "q",
    "0.055 0.075 0.105 rg 0 0 842 595 re f",
    "0.40 0.88 0.62 RG 3 w 28 28 786 539 re S",
    "0.40 0.88 0.62 RG 1 w 42 42 758 511 re S",
    "0.40 0.88 0.62 rg 60 515 192 4 re f",
    "BT /F1 15 Tf 0.40 0.88 0.62 rg 60 488 Td (UZYNTRA CERTS) Tj ET",
    "BT /F2 36 Tf 0.96 0.97 0.98 rg 60 438 Td (Certificate of Verification) Tj ET",
    `BT /F1 14 Tf 0.74 0.78 0.84 rg 62 404 Td (This certifies that) Tj ET`,
    `BT /F2 30 Tf 0.96 0.97 0.98 rg 62 362 Td (${esc(line(credential.holder, 36))}) Tj ET`,
    `BT /F1 14 Tf 0.74 0.78 0.84 rg 62 331 Td (has earned) Tj ET`,
    `BT /F2 24 Tf 0.40 0.88 0.62 rg 62 294 Td (${esc(line(credential.title, 45))}) Tj ET`,
    `BT /F1 12 Tf 0.82 0.85 0.9 rg 62 263 Td (Issued by ${esc(line(credential.issuer, 48))}) Tj ET`,
    `BT /F1 10 Tf 0.78 0.81 0.86 rg 62 236 Td (Credential type: ${esc(credential.credential_type.replaceAll("_", " "))}) Tj ET`,
    `BT /F1 10 Tf 0.78 0.81 0.86 rg 62 216 Td (Issue date: ${esc(credential.issue_date)}${credential.expiry_date ? `    Expiry date: ${esc(credential.expiry_date)}` : "    Expiry date: No expiry"}) Tj ET`,
    "BT /F1 10 Tf 0.78 0.81 0.86 rg 62 194 Td (Credential ID:) Tj ET",
    ...credentialLines.map((value, index) => `BT /F1 9 Tf 0.86 0.89 0.94 rg 140 ${194 - index * 13} Td (${esc(value)}) Tj ET`),
    `BT /F1 10 Tf 0.78 0.81 0.86 rg 62 154 Td (Certificate slug: ${esc(line(credential.certificate_slug, 44))}) Tj ET`,
    badge ? `BT /F1 10 Tf 0.40 0.88 0.62 rg 62 133 Td (Badge: ${esc(line(badge.name, 48))}${badge.level ? ` / ${esc(line(badge.level, 18))}` : ""}) Tj ET` : "",
    "0.40 0.88 0.62 RG 1 w 620 338 118 118 re S",
    "0.40 0.88 0.62 rg 638 416 82 8 re f 638 396 82 8 re f 638 376 82 8 re f",
    "BT /F1 10 Tf 0.74 0.78 0.84 rg 601 304 Td (Scan QR on web certificate) Tj ET",
    `BT /F1 8 Tf 0.78 0.81 0.86 rg 570 284 Td (${esc(line(verifyUrl, 46))}) Tj ET`,
    "0.40 0.88 0.62 RG 1 w 62 86 230 1 re S 552 86 204 1 re S",
    "BT /F1 10 Tf 0.74 0.78 0.84 rg 62 67 Td (Authorized UZYNTRA Certs Record) Tj ET",
    "BT /F3 30 Tf 0.96 0.97 0.98 rg 575 108 Td (m.usama) Tj ET",
    "BT /F1 10 Tf 0.74 0.78 0.84 rg 566 67 Td (Authorized Signature) Tj ET",
    ...certificateLines.slice(0, 2).map((value, index) => `BT /F1 8 Tf 0.55 0.59 0.64 rg 62 ${45 - index * 11} Td (${index === 0 ? "View online: " : ""}${esc(value)}) Tj ET`),
    "Q",
  ].filter(Boolean).join("\n");

  return buildPdf(content);
}

function buildPdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /ZapfChancery-MediumItalic >>",
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
