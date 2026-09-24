import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function isEmailRegistered(email: string): Promise<import("./service").RegistrationState> {
  const { data, error } = await createAdminClient().rpc("registration_email_state", { email_to_check: email.trim().toLowerCase() });
  // Fail closed: never send signup mail when the lookup cannot be completed.
  if (error || !["new", "unverified", "verified"].includes(data ?? "")) throw new Error("Registration lookup unavailable.");
  return data as import("./service").RegistrationState;
}
