import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

// Separate from session clients: never attach user cookies or browser storage.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key?.startsWith("sb_secret_") || key.length < 20) {
    throw new Error("A server-only SUPABASE_SECRET_KEY is required for registration checks.");
  }
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
