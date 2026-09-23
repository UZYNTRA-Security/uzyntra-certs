import { z } from "zod";

export const DEFAULT_SITE_URL = "https://certs.uzyntra.com";

const httpUrl = z.url().refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
    && url.pathname === "/" && !url.search && !url.hash;
}, "Must be an HTTP(S) origin without credentials, paths, queries, or fragments")
  .transform((value) => new URL(value).origin);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().startsWith("sb_publishable_").min(20),
});

export function parsePublicEnv(input: Record<string, unknown>, production = false) {
  const result = publicEnvSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}. See .env.example.`);
  }
  if (production && [result.data.NEXT_PUBLIC_SITE_URL, result.data.NEXT_PUBLIC_SUPABASE_URL].some((url) => !url.startsWith("https://"))) {
    throw new Error("Production site and Supabase URLs must use HTTPS.");
  }
  return result.data;
}

// Shell deployments need a site origin, but do not require a live backend.
export function parseDeploymentEnv(input: Record<string, unknown>, production = false) {
  const siteInput = input.NEXT_PUBLIC_SITE_URL;
  if (input.VERCEL === "1" && !siteInput) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required on Vercel.");
  }
  const result = httpUrl.safeParse(siteInput || DEFAULT_SITE_URL);
  if (!result.success || (production && !result.data.startsWith("https://"))) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid origin; production requires HTTPS.");
  }
  const hasBackend = Boolean(input.NEXT_PUBLIC_SUPABASE_URL || input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (production && input.VERCEL === "1" && input.VERCEL_ENV === "production" && !hasBackend) {
    throw new Error("Production authentication requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  if (hasBackend) parsePublicEnv({ ...input, NEXT_PUBLIC_SITE_URL: result.data }, production);
  return { siteUrl: result.data, hasBackend };
}
