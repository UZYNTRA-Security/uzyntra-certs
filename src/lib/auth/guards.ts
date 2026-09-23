import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { verifiedUser } from "@/lib/auth/service";
import { hasSupabaseConfig } from "@/lib/env/public";
import { redirect } from "next/navigation";

export const getCurrentUser = cache(async () => {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createClient();
  return verifiedUser(supabase.auth);
});

// Call inside every protected data operation, Server Action, and Route Handler.
// Identity is not an admin role: add explicit permissions plus RLS for new features.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Authentication is required.", 401);
  return user;
}

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
