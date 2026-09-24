import { createHmac } from "node:crypto";
import { isIP } from "node:net";
export function requesterHash(headers: Pick<Headers, "get">, secret: string, vercel: boolean) {
  // Vercel overwrites this header. Ignore caller-supplied forwarding headers off Vercel.
  const candidate = vercel ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const identity = candidate && isIP(candidate) ? candidate : "shared-unidentified-requester";
  return createHmac("sha256", secret).update(`uzyntra:verification:${identity}`).digest("hex");
}
