import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const recoveryGrantLifetime = 600;
function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`uzyntra:recovery:${payload}`).digest("hex");
}
export function issueRecoveryGrant(userId: string, accessToken: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, token: createHash("sha256").update(accessToken).digest("hex"), expires: now + recoveryGrantLifetime * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function validRecoveryGrant(grant: string | undefined, userId: string, accessToken: string, secret: string, now = Date.now()) {
  if (!grant || grant.length > 2048) return false;
  const [payload, supplied, extra] = grant.split(".");
  if (extra || !payload || !supplied || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  if (!timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(payload, secret), "hex"))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.sub === userId && data.token === createHash("sha256").update(accessToken).digest("hex") && typeof data.expires === "number" && data.expires > now;
  } catch { return false; }
}
