import { z } from "zod";

const httpUrl = z.url().refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, "Must be an HTTP(S) URL without credentials");

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().startsWith("sb_publishable_"),
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
