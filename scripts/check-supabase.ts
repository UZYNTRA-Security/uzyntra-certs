import { loadEnvConfig } from "@next/env";
import { parsePublicEnv, parseDeploymentEnv } from "../src/lib/env/schema";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd(), !process.argv.includes("--production"));

async function main() {
  const production = process.argv.includes("--production");
  const deployment = parseDeploymentEnv(process.env, production);
  const env = parsePublicEnv({ ...process.env, NEXT_PUBLIC_SITE_URL: deployment.siteUrl }, production);
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Supabase Auth settings request failed (HTTP ${response.status}).`);
  const settings = await response.json();
  if (settings.external?.email !== true) throw new Error("Enable email/password authentication in Supabase.");
  if (settings.disable_signup !== false) throw new Error("Enable new user signups in Supabase.");
  if (settings.mailer_autoconfirm !== false) throw new Error("Enable email confirmations in Supabase before deployment.");
  console.log("Supabase Auth is reachable; email/password, signup, and required email confirmation are configured.");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key?.startsWith("sb_secret_")) throw new Error("Set server-only SUPABASE_SECRET_KEY before checking database readiness.");
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const registration = await client.rpc("registration_email_state", { email_to_check: `readiness-${crypto.randomUUID()}@example.invalid` });
  if (registration.error || registration.data !== "new") throw new Error("Registration-state RPC is unavailable. Apply the Auth state migration and verify server permissions.");
  // Deliberately invalid ID exits before rate-limit or audit writes; this check is read-only.
  const verification = await client.rpc("verify_public_credential", { requested_id: "%", requester_hash: "0".repeat(64) });
  if (verification.error || verification.data?.outcome !== "not_found") throw new Error("Verification RPC is unavailable. Apply the credential foundation migration and verify server permissions.");
  console.log("Registration and public verification RPCs are reachable; no emails, users, credentials, or audit records were created.");
  console.log("Verify SMTP delivery, redirect allowlist, confirmation template, and disabled MFA separately in the dashboard.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Supabase configuration check failed.");
  process.exitCode = 1;
});
