import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
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

const pageSize: [number, number] = [842, 595];
const green = rgb(0.4, 0.88, 0.62);
const bg = rgb(0.055, 0.075, 0.105);
const text = rgb(0.96, 0.97, 0.98);
const muted = rgb(0.74, 0.78, 0.84);
const faint = rgb(0.48, 0.52, 0.58);
const darkPanel = rgb(0.035, 0.05, 0.075);

export async function renderCertificatePdf(credential: CertificatePdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage(pageSize);
  const fonts = await loadFonts(pdf);
  const verifyUrl = new URL(`/v/${credential.credential_id}`, getSiteUrl()).toString();
  const logo = await readLogo();

  drawShell(page);
  if (logo) {
    const image = await pdf.embedPng(logo);
    page.drawImage(image, { x: 72, y: 480, width: 44, height: 44 });
  } else {
    drawFallbackLogo(page);
  }

  if (isRecognitionCertificate(credential)) {
    drawRecognitionTemplate(page, fonts, credential);
  } else {
    drawCourseTemplate(page, fonts, credential);
  }

  drawQr(page, verifyUrl, 730, 472, 46);
  drawCenteredText(page, "Scan to verify", 753, 451, 6.8, fonts.body, muted);
  drawSignature(page, fonts, credential);

  return Buffer.from(await pdf.save());
}

async function loadFonts(pdf: PDFDocument) {
  const [body, heading, mono] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.Courier),
  ]);
  const [bastliga, allura, centralwell] = await Promise.all([
    embedOptionalFont(pdf, "Bastliga One.ttf"),
    embedOptionalFont(pdf, "Allura-Regular.ttf"),
    embedOptionalFont(pdf, "Centralwell.ttf"),
  ]);
  return { body, heading, mono, bastliga: bastliga ?? allura ?? body, allura: allura ?? bastliga ?? body, centralwell: centralwell ?? bastliga ?? body };
}

async function embedOptionalFont(pdf: PDFDocument, filename: string) {
  const data = await readFont(filename);
  return data ? pdf.embedFont(data) : null;
}

async function readFont(filename: string) {
  try { return await readFile(path.join(process.cwd(), "public", "fonts", filename)); } catch { return null; }
}

async function readLogo() {
  try { return await readFile(path.join(process.cwd(), "public", "logo", "uzyntra-pdf-logo-dark.png")); } catch { return null; }
}

function drawShell(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: bg });
  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, color: darkPanel, borderColor: green, borderWidth: 1.6 });
  page.drawRectangle({ x: 38, y: 38, width: 766, height: 519, borderColor: rgb(0.22, 0.52, 0.38), borderWidth: 0.7 });
  page.drawLine({ start: { x: 74, y: 446 }, end: { x: 768, y: 446 }, color: rgb(0.14, 0.3, 0.24), thickness: 0.55 });
  page.drawLine({ start: { x: 92, y: 156 }, end: { x: 750, y: 156 }, color: rgb(0.14, 0.3, 0.24), thickness: 0.55 });
  page.drawRectangle({ x: 72, y: 530, width: 165, height: 2.2, color: green });
}

function drawFallbackLogo(page: PDFPage) {
  page.drawRectangle({ x: 60, y: 478, width: 34, height: 42, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 68, y: 499, width: 8, height: 8, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 80, y: 499, width: 8, height: 8, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 68, y: 486, width: 20, height: 2, color: green });
}

function drawQr(page: PDFPage, value: string, x: number, y: number, size: number) {
  page.drawRectangle({ x: x - 5, y: y - 5, width: size + 10, height: size + 10, color: rgb(1, 1, 1) });
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  const cell = size / count;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) page.drawRectangle({ x: x + col * cell, y: y + size - (row + 1) * cell, width: cell, height: cell, color: bg });
    }
  }
}

function drawBrandHeader(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, subtitle = "Digital Credential Verification Platform") {
  page.drawText("UZYNTRA CERTS", { x: 128, y: 506, size: 16, font: fonts.heading, color: green });
  page.drawText("by UZYNTRA Security", { x: 129, y: 490, size: 9, font: fonts.body, color: muted });
  page.drawText(subtitle, { x: 129, y: 476, size: 8, font: fonts.body, color: faint });
}

function drawCourseTemplate(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  drawBrandHeader(page, fonts, "Professional Training & Certification");
  drawCenteredText(page, "Certificate of Completion", 421, 402, 35, fonts.heading, text);
  drawCenteredText(page, "This certifies that", 421, 364, 13, fonts.body, muted);
  drawCenteredText(page, fitText(credential.holder, 38), 421, 319, 34, fonts.heading, text);
  page.drawLine({ start: { x: 246, y: 305 }, end: { x: 596, y: 305 }, color: rgb(0.22, 0.52, 0.38), thickness: 0.6 });
  drawCenteredText(page, "has successfully completed", 421, 270, 12.5, fonts.body, muted);
  drawCenteredText(page, fitText(credential.title, 44), 421, 226, 31, fonts.heading, green);
  drawCourseSummary(page, fonts, credential);
  drawSeal(page, fonts, 502, 98, 32);
}

function drawRecognitionTemplate(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  drawBrandHeader(page, fonts, "Recognition Award");
  drawCenteredText(page, "Recognition Award", 421, 402, 35, fonts.heading, text);
  drawCenteredText(page, "This recognition is presented to", 421, 365, 13, fonts.body, muted);
  drawCenteredText(page, fitText(credential.holder, 38), 421, 321, 34, fonts.heading, text);
  page.drawLine({ start: { x: 246, y: 307 }, end: { x: 596, y: 307 }, color: rgb(0.22, 0.52, 0.38), thickness: 0.6 });
  drawCenteredText(page, "for", 421, 274, 12.5, fonts.body, muted);
  drawCenteredText(page, fitText(credential.title, 44), 421, 234, 29, fonts.heading, green);
  drawCenteredText(page, "In recognition of valuable security research and contribution to improving digital security.", 421, 203, 10, fonts.body, muted);
  drawRecognitionSummary(page, fonts, credential);
  drawSeal(page, fonts, 502, 98, 32);
}

function drawCourseSummary(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  page.drawText("Issued by:", { x: 116, y: 119, size: 8.5, font: fonts.body, color: faint });
  page.drawText(fitText(credential.issuer, 38), { x: 116, y: 101, size: 11, font: fonts.heading, color: text });
  page.drawText("Completion Date:", { x: 306, y: 119, size: 8.5, font: fonts.body, color: faint });
  page.drawText(formatDate(credential.issue_date), { x: 306, y: 101, size: 11, font: fonts.heading, color: text });
}

function drawRecognitionSummary(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  page.drawText("Presented by:", { x: 116, y: 119, size: 8.5, font: fonts.body, color: faint });
  page.drawText(fitText(credential.issuer, 38), { x: 116, y: 101, size: 11, font: fonts.heading, color: text });
  page.drawText("Presented on:", { x: 306, y: 119, size: 8.5, font: fonts.body, color: faint });
  page.drawText(formatDate(credential.issue_date), { x: 306, y: 101, size: 11, font: fonts.heading, color: text });
}

function drawSeal(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, cx: number, cy: number, radius: number) {
  page.drawCircle({ x: cx, y: cy, size: radius, borderColor: green, borderWidth: 1.4 });
  page.drawCircle({ x: cx, y: cy, size: radius - 8, borderColor: rgb(0.22, 0.52, 0.38), borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: radius - 19, borderColor: green, borderWidth: 0.7 });
  page.drawLine({ start: { x: cx - 9, y: cy - 1 }, end: { x: cx - 3, y: cy - 8 }, color: green, thickness: 1.4 });
  page.drawLine({ start: { x: cx - 3, y: cy - 8 }, end: { x: cx + 12, y: cy + 8 }, color: green, thickness: 1.4 });
  drawCenteredText(page, "UZYNTRA CERTS", cx, cy + 20, 4.7, fonts.heading, green);
  drawCenteredText(page, "VERIFIED", cx, cy - 18, 5.7, fonts.heading, text);
  drawCenteredText(page, "CERTIFICATION AUTHORITY", cx, cy - 26, 3.6, fonts.body, muted);
}

function drawSignature(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  const font = fonts.allura;
  const signature = "m.Usama";
  const signatureSize = 42;
  const signatureWidth = font.widthOfTextAtSize(signature, signatureSize);
  const centerX = 660;
  page.drawText(signature, { x: centerX - signatureWidth / 2, y: 127, size: signatureSize, font, color: text });
  page.drawLine({ start: { x: 594, y: 112 }, end: { x: 726, y: 112 }, color: green, thickness: 1 });
  drawCenteredText(page, "Muhammad Usama", centerX, 94, 10.8, fonts.heading, text);
  drawCenteredText(page, "Founder & CEO", centerX, 80, 8.2, fonts.body, muted);
  drawCenteredText(page, fitText(credential.issuer, 30), centerX, 67, 8.2, fonts.body, muted);
  drawCenteredText(page, "Authorized Certification Authority", centerX, 55, 7.7, fonts.heading, muted);
}

function fitText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function drawCenteredText(page: PDFPage, value: string, centerX: number, y: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) {
  const width = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: centerX - width / 2, y, size, font, color });
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function isRecognitionCertificate(credential: CertificatePdfInput) {
  const type = credential.credential_type.toUpperCase();
  const category = credential.category.toUpperCase();
  return (
    type === "RECOGNITION_CERTIFICATE" ||
    type.includes("RECOGNITION") ||
    type.includes("APPRECIATION") ||
    type.includes("AWARD") ||
    category === "BUG_BOUNTY" ||
    category === "CONTRIBUTION" ||
    category === "APPRECIATION" ||
    category === "APPRECIATIONS"
  );
}

