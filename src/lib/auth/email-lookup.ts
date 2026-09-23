import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function isEmailRegistered(email: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("is_email_registered", { email_to_check: email.trim().toLowerCase() });
  // Fail closed: never send signup mail when the lookup cannot be completed.
  if (error || typeof data !== "boolean") throw new Error("Registration lookup unavailable.");
  return data;
}
