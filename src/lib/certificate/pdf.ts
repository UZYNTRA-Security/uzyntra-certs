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
    page.drawImage(image, { x: 56, y: 464, width: 68, height: 68 });
  } else {
    drawFallbackLogo(page);
  }

  if (isRecognitionCertificate(credential)) {
    drawRecognitionTemplate(page, fonts, credential);
  } else {
    drawCourseTemplate(page, fonts, credential);
  }

  drawQr(page, verifyUrl, 714, 455, 62);
  drawCenteredText(page, "Scan to verify", 745, 438, 8, fonts.body, muted);
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
  page.drawLine({ start: { x: 72, y: 466 }, end: { x: 770, y: 466 }, color: rgb(0.18, 0.34, 0.28), thickness: 0.7 });
  page.drawLine({ start: { x: 72, y: 145 }, end: { x: 770, y: 145 }, color: rgb(0.18, 0.34, 0.28), thickness: 0.7 });
  page.drawRectangle({ x: 72, y: 530, width: 185, height: 3, color: green });
  page.drawRectangle({ x: 585, y: 62, width: 150, height: 2, color: green });
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
  page.drawText("UZYNTRA CERTS", { x: 138, y: 505, size: 17, font: fonts.heading, color: green });
  page.drawText("by UZYNTRA Security", { x: 139, y: 488, size: 9.5, font: fonts.body, color: muted });
  page.drawText(subtitle, { x: 139, y: 474, size: 8.5, font: fonts.body, color: faint });
}

function drawCourseTemplate(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  drawBrandHeader(page, fonts, "Professional Training & Certification");
  drawCenteredText(page, "Certificate of Completion", 421, 420, 38, fonts.heading, text);
  drawCenteredText(page, "This certifies that", 421, 381, 14, fonts.body, muted);
  drawCenteredText(page, fitText(credential.holder, 38), 421, 331, 35, fonts.heading, text);
  page.drawLine({ start: { x: 218, y: 319 }, end: { x: 624, y: 319 }, color: rgb(0.22, 0.52, 0.38), thickness: 0.7 });
  drawCenteredText(page, "has successfully completed", 421, 284, 13, fonts.body, muted);
  drawCenteredText(page, fitText(credential.title, 44), 421, 236, 31, fonts.heading, green);
  drawCourseSummary(page, fonts, credential);
}

function drawRecognitionTemplate(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  drawBrandHeader(page, fonts, "Recognition Award");
  drawCenteredText(page, "Recognition Award", 421, 420, 38, fonts.heading, text);
  drawCenteredText(page, "This recognition is presented to", 421, 382, 14, fonts.body, muted);
  drawCenteredText(page, fitText(credential.holder, 38), 421, 334, 35, fonts.heading, text);
  page.drawLine({ start: { x: 216, y: 318 }, end: { x: 626, y: 318 }, color: rgb(0.22, 0.52, 0.38), thickness: 0.7 });
  drawCenteredText(page, "for", 421, 286, 13, fonts.body, muted);
  drawCenteredText(page, fitText(credential.title, 44), 421, 242, 30, fonts.heading, green);
  drawCenteredText(page, "In recognition of valuable security research and contribution to improving digital security.", 421, 206, 10.5, fonts.body, muted);
  drawRecognitionSummary(page, fonts, credential);
  drawSeal(page, fonts);
}

function drawCourseSummary(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  page.drawText("Issued by:", { x: 116, y: 119, size: 9, font: fonts.body, color: faint });
  page.drawText(fitText(credential.issuer, 38), { x: 116, y: 101, size: 12, font: fonts.heading, color: text });
  page.drawText("Completion Date:", { x: 306, y: 119, size: 9, font: fonts.body, color: faint });
  page.drawText(formatDate(credential.issue_date), { x: 306, y: 101, size: 12, font: fonts.heading, color: text });
}

function drawRecognitionSummary(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  page.drawText("Presented by:", { x: 116, y: 119, size: 9, font: fonts.body, color: faint });
  page.drawText(fitText(credential.issuer, 38), { x: 116, y: 101, size: 12, font: fonts.heading, color: text });
  page.drawText("Presented on:", { x: 306, y: 119, size: 9, font: fonts.body, color: faint });
  page.drawText(formatDate(credential.issue_date), { x: 306, y: 101, size: 12, font: fonts.heading, color: text });
}

function drawSeal(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>) {
  const cx = 492;
  const cy = 94;
  page.drawCircle({ x: cx, y: cy, size: 48, borderColor: green, borderWidth: 2 });
  page.drawCircle({ x: cx, y: cy, size: 39, borderColor: rgb(0.22, 0.52, 0.38), borderWidth: 0.9 });
  page.drawCircle({ x: cx, y: cy, size: 24, color: rgb(0.055, 0.12, 0.095), borderColor: green, borderWidth: 0.8 });
  drawCenteredText(page, "UZYNTRA", cx, cy + 18, 8, fonts.heading, green);
  drawCenteredText(page, "CERTS", cx, cy + 7, 8, fonts.heading, text);
  drawCenteredText(page, "VERIFIED", cx, cy - 7, 7.5, fonts.heading, green);
  drawCenteredText(page, "AUTHORITY", cx, cy - 19, 6, fonts.body, muted);
}

function drawSignature(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  const premium = credential.credential_type === "APPRECIATION" || credential.credential_type === "ACHIEVEMENT" || credential.credential_type === "BUG_BOUNTY";
  const font = premium ? fonts.centralwell : fonts.bastliga;
  const signature = "m.usama";
  const signatureSize = premium ? 58 : 60;
  const signatureWidth = font.widthOfTextAtSize(signature, signatureSize);
  const centerX = 660;
  page.drawText(signature, { x: centerX - signatureWidth / 2, y: 135, size: signatureSize, font, color: text });
  page.drawText("Muhammad Usama", { x: 607, y: 88, size: 11.5, font: fonts.heading, color: text });
  page.drawText("Founder & CEO", { x: 624, y: 72, size: 9, font: fonts.body, color: muted });
  page.drawText(fitText(credential.issuer, 30), { x: 608, y: 56, size: 9, font: fonts.body, color: muted });
  page.drawText("Authorized Certification Authority", { x: 584, y: 42, size: 8.5, font: fonts.heading, color: muted });
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

