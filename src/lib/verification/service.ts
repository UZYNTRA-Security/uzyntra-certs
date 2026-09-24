import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialIdSchema, verificationResultSchema, type VerificationResult } from "./schema";
import { requesterHash } from "./requester";
export const verifyCredential = cache(async (input: string): Promise<VerificationResult> => {
  const parsed = credentialIdSchema.safeParse(input);
  if (!parsed.success) return { outcome: "not_found" };
  try {
    const client = createAdminClient();
    const key = requesterHash(await headers(), process.env.SUPABASE_SECRET_KEY!, process.env.VERCEL === "1");
    const { data, error } = await client.rpc("verify_public_credential", { requested_id: parsed.data, requester_hash: key });
    if (error) return { outcome: "unavailable" };
    const result = verificationResultSchema.safeParse(data);
    return result.success ? result.data : { outcome: "unavailable" };
  } catch { return { outcome: "unavailable" }; }
});
