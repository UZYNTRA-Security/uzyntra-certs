import assert from "node:assert/strict";
import test from "node:test";
import { verificationQr } from "../src/lib/qr";
test("QR generation creates a PNG containing a credential verification URL",async()=>{const result=await verificationQr("https://certs.uzyntra.com/v/UZY-CERT-2026-A82KD");assert.ok(result.length>1000);assert.deepEqual([...result.subarray(0,8)],[137,80,78,71,13,10,26,10]);});
test("QR generation rejects unsafe non-HTTP destinations",async()=>{await assert.rejects(verificationQr("javascript:alert(1)"),/Invalid verification URL/);});
