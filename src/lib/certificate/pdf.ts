import { getSiteUrl } from "@/lib/metadata";
import QRCode from "qrcode";

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
  const qr = pdfQr(verifyUrl, 620, 326, 124);
  const content = [
    "q",
    "0.055 0.075 0.105 rg 0 0 842 595 re f",
    "0.40 0.88 0.62 RG 3 w 28 28 786 539 re S",
    "0.40 0.88 0.62 RG 1 w 42 42 758 511 re S",
    "0.40 0.88 0.62 RG 2 w 60 478 34 42 re S",
    "0.40 0.88 0.62 RG 2 w 68 499 8 8 re S 80 499 8 8 re S 68 486 20 2 re S",
    "0.40 0.88 0.62 rg 60 515 192 4 re f",
    "BT /F1 15 Tf 0.40 0.88 0.62 rg 108 492 Td (UZYNTRA CERTS) Tj ET",
    "BT /F1 8 Tf 0.74 0.78 0.84 rg 109 480 Td (by UZYNTRA Security) Tj ET",
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
    "1 1 1 rg 614 320 136 136 re f",
    qr,
    "BT /F1 10 Tf 0.74 0.78 0.84 rg 596 300 Td (Scan to verify certificate) Tj ET",
    `BT /F1 8 Tf 0.78 0.81 0.86 rg 570 282 Td (${esc(line(verifyUrl, 48))}) Tj ET`,
    "0.40 0.88 0.62 RG 1 w 62 86 230 1 re S 552 86 204 1 re S",
    "BT /F1 10 Tf 0.74 0.78 0.84 rg 62 67 Td (Authorized UZYNTRA Certs Record) Tj ET",
    "BT /F3 30 Tf 0.96 0.97 0.98 rg 575 108 Td (m.usama) Tj ET",
    "BT /F1 10 Tf 0.74 0.78 0.84 rg 566 67 Td (Authorized Signature) Tj ET",
    ...certificateLines.slice(0, 2).map((value, index) => `BT /F1 8 Tf 0.55 0.59 0.64 rg 62 ${45 - index * 11} Td (${index === 0 ? "View online: " : ""}${esc(value)}) Tj ET`),
    "Q",
  ].filter(Boolean).join("\n");

  return buildPdf(content);
}

function pdfQr(value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  const cell = size / count;
  const commands = [`0.055 0.075 0.105 rg`];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) {
        commands.push(`${(x + col * cell).toFixed(2)} ${(y + size - (row + 1) * cell).toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re f`);
      }
    }
  }
  return commands.join("\n");
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
