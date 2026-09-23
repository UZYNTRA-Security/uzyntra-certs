import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403) return null;
    throw new AppError("AUTH_UNAVAILABLE", "Authentication is temporarily unavailable.", 503);
  }
  return data.user;
});

// Call inside every protected data operation, Server Action, and Route Handler.
// Identity is not an admin role: add explicit permissions plus RLS for new features.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Authentication is required.", 401);
  return user;
}
