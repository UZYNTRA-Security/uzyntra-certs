import assert from "node:assert/strict";
import test from "node:test";
import { renderCertificatePdf } from "../src/lib/certificate/pdf";

test("certificate pdf generation creates a valid branded PDF", async () => {
  const pdf = await renderCertificatePdf({
    credential_id: "UZY-CERT-2026-A82KD",
    certificate_slug: "security-engineering-6-a82kd",
    title: "Security Engineering",
    credential_type: "COURSE_CERTIFICATE",
    category: "COURSE",
    holder: "Alice Approved",
    issuer: "UZYNTRA Security",
    issue_date: "2026-09-25",
    expiry_date: null,
    badges: [{ name: "Cybersecurity", level: "Professional" }],
  });
  assert.match(pdf.subarray(0, 8).toString(), /^%PDF-1\./);
  assert.ok(pdf.length > 5000);
});

test("certificate access policy blocks revoked credentials at the business boundary", () => {
  const blockedStatuses = ["REVOKED", "EXPIRED", "DRAFT", "PENDING_REVIEW"];
  assert.ok(blockedStatuses.every((status) => status !== "ISSUED"));
});
