import { loadEnvConfig } from "@next/env";
import { parsePublicEnv } from "../src/lib/env/schema";

loadEnvConfig(process.cwd(), !process.argv.includes("--production"));

async function main() {
  const env = parsePublicEnv(process.env, process.argv.includes("--production"));
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
  console.log("Verify SMTP delivery, redirect allowlist, confirmation template, and disabled MFA separately in the dashboard.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Supabase configuration check failed.");
  process.exitCode = 1;
});
