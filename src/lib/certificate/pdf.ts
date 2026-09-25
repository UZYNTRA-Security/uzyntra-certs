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
const chunks = (value: string, size: number) => value.match(new RegExp(`.{1,${size}}`, "g")) ?? [value];

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
    page.drawImage(image, { x: 56, y: 463, width: 66, height: 66 });
  } else {
    drawFallbackLogo(page);
  }

  page.drawText("UZYNTRA CERTS", { x: 134, y: 501, size: 16, font: fonts.body, color: green });
  page.drawText("by UZYNTRA Security", { x: 135, y: 485, size: 9, font: fonts.body, color: muted });
  page.drawText("Digital Credential Verification Platform", { x: 135, y: 471, size: 8, font: fonts.body, color: faint });
  page.drawText("Certificate of Verification", { x: 60, y: 430, size: 38, font: fonts.heading, color: text });
  page.drawText("This certifies that", { x: 62, y: 398, size: 14, font: fonts.body, color: muted });
  page.drawText(fitText(credential.holder, 34), { x: 62, y: 356, size: 31, font: fonts.heading, color: text });
  page.drawText("has earned", { x: 62, y: 326, size: 14, font: fonts.body, color: muted });
  page.drawText(fitText(credential.title, 40), { x: 62, y: 286, size: 30, font: fonts.heading, color: green });
  page.drawText(`Issued by ${fitText(credential.issuer, 48)}`, { x: 62, y: 253, size: 12, font: fonts.body, color: text });

  drawMeta(page, fonts, credential);
  drawQr(page, verifyUrl, 640, 360, 110);
  drawQrDetails(page, fonts, credential, verifyUrl);

  drawSignature(page, fonts, credential);
  page.drawText("Authorized UZYNTRA Certs Record", { x: 62, y: 101, size: 11, font: fonts.heading, color: muted });
  page.drawText("Verification URL:", { x: 62, y: 82, size: 9, font: fonts.body, color: faint });
  drawWrapped(page, verifyUrl, 62, 68, 78, 8.5, fonts.mono, muted, 2);
  page.drawText("Credential ID:", { x: 62, y: 48, size: 8.5, font: fonts.body, color: faint });
  page.drawText(fitText(credential.credential_id, 56), { x: 126, y: 48, size: 8.5, font: fonts.mono, color: muted });

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
  page.drawRectangle({ x: 28, y: 28, width: 786, height: 539, borderColor: green, borderWidth: 3 });
  page.drawRectangle({ x: 42, y: 42, width: 758, height: 511, borderColor: green, borderWidth: 1 });
  page.drawRectangle({ x: 60, y: 516, width: 192, height: 4, color: green });
  page.drawRectangle({ x: 62, y: 105, width: 230, height: 1, color: green });
  page.drawRectangle({ x: 542, y: 105, width: 224, height: 1, color: green });
}

function drawFallbackLogo(page: PDFPage) {
  page.drawRectangle({ x: 60, y: 478, width: 34, height: 42, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 68, y: 499, width: 8, height: 8, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 80, y: 499, width: 8, height: 8, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 68, y: 486, width: 20, height: 2, color: green });
}

function drawMeta(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  const badge = credential.badges[0];
  page.drawText(`Credential type: ${credential.credential_type.replaceAll("_", " ")}`, { x: 62, y: 227, size: 10, font: fonts.body, color: muted });
  page.drawText(`Issue date: ${formatDate(credential.issue_date)}    Expiry date: ${credential.expiry_date ? formatDate(credential.expiry_date) : "No expiry"}`, { x: 62, y: 207, size: 10, font: fonts.body, color: muted });
  page.drawText("Credential ID:", { x: 62, y: 185, size: 10, font: fonts.body, color: muted });
  drawWrapped(page, credential.credential_id, 140, 185, 34, 9, fonts.mono, text);
  page.drawText(`Certificate slug: ${fitText(credential.certificate_slug, 44)}`, { x: 62, y: 145, size: 10, font: fonts.body, color: muted });
  if (badge) page.drawText(`Badge: ${fitText(badge.name, 48)}${badge.level ? ` / ${fitText(badge.level, 18)}` : ""}`, { x: 62, y: 124, size: 10, font: fonts.body, color: green });
}

function drawQr(page: PDFPage, value: string, x: number, y: number, size: number) {
  page.drawRectangle({ x: x - 6, y: y - 6, width: size + 12, height: size + 12, color: rgb(1, 1, 1) });
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  const cell = size / count;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) page.drawRectangle({ x: x + col * cell, y: y + size - (row + 1) * cell, width: cell, height: cell, color: bg });
    }
  }
}

function drawQrDetails(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput, verifyUrl: string) {
  page.drawText("SCAN TO VERIFY", { x: 604, y: 337, size: 9, font: fonts.heading, color: green });
  page.drawText("STATUS", { x: 604, y: 315, size: 7, font: fonts.body, color: faint });
  page.drawText("VERIFIED", { x: 604, y: 302, size: 10, font: fonts.heading, color: text });
  page.drawText("ISSUED", { x: 604, y: 281, size: 7, font: fonts.body, color: faint });
  page.drawText(formatDate(credential.issue_date), { x: 604, y: 268, size: 9, font: fonts.body, color: muted });
  page.drawText("CREDENTIAL ID", { x: 604, y: 247, size: 7, font: fonts.body, color: faint });
  drawWrapped(page, credential.credential_id, 604, 235, 27, 7, fonts.mono, text, 2);
  page.drawText("VERIFY ONLINE", { x: 604, y: 199, size: 7, font: fonts.body, color: faint });
  drawWrapped(page, verifyUrl, 604, 187, 32, 7, fonts.mono, muted, 2);
}

function drawSignature(page: PDFPage, fonts: Awaited<ReturnType<typeof loadFonts>>, credential: CertificatePdfInput) {
  const premium = credential.credential_type === "APPRECIATION" || credential.credential_type === "ACHIEVEMENT" || credential.credential_type === "BUG_BOUNTY";
  const font = premium ? fonts.centralwell : fonts.bastliga;
  const signature = "m.usama";
  const signatureSize = premium ? 58 : 60;
  const signatureWidth = font.widthOfTextAtSize(signature, signatureSize);
  const centerX = 656;
  page.drawText(signature, { x: centerX - signatureWidth / 2, y: 137, size: signatureSize, font, color: text });
  page.drawText("Muhammad Usama", { x: 603, y: 89, size: 11, font: fonts.heading, color: text });
  page.drawText("Founder & CEO", { x: 620, y: 73, size: 9, font: fonts.body, color: muted });
  page.drawText(fitText(credential.issuer, 30), { x: 604, y: 58, size: 9, font: fonts.body, color: muted });
  page.drawText("Authorized Issuing Authority", { x: 576, y: 45, size: 9, font: fonts.heading, color: muted });
}

function drawWrapped(page: PDFPage, value: string, x: number, y: number, size: number, fontSize: number, font: PDFFont, color: ReturnType<typeof rgb>, maxLines = 3) {
  for (const [index, chunk] of chunks(value, size).slice(0, maxLines).entries()) {
    page.drawText(chunk, { x, y: y - index * (fontSize + 4), size: fontSize, font, color });
  }
}

function fitText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

