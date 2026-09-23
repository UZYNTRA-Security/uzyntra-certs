import { loadEnvConfig } from "@next/env";
import { parsePublicEnv } from "../src/lib/env/schema";

loadEnvConfig(process.cwd());
try {
  parsePublicEnv(process.env, process.env.NODE_ENV === "production");
  console.log("Environment configuration is valid.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid environment configuration.");
  process.exitCode = 1;
}
