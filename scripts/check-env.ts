import { loadEnvConfig } from "@next/env";
import { parseDeploymentEnv } from "../src/lib/env/schema";

const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
loadEnvConfig(process.cwd(), !production);
try {
  const config = parseDeploymentEnv(process.env, production);
  console.log(`Environment configuration is valid. Backend: ${config.hasBackend ? "configured" : "not configured (shell only)"}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid environment configuration.");
  process.exitCode = 1;
}
