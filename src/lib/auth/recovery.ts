import type { SupabaseClient } from "@supabase/supabase-js";
import { passwordResetSchema, resendSchema, type AuthFormState } from "./validation";

type RecoveryAuth = Pick<SupabaseClient["auth"], "resetPasswordForEmail" | "verifyOtp" | "updateUser" | "signOut">;
export const invalidRecovery: AuthFormState = { status: "error", code: "INVALID_RECOVERY", message: "This reset link is invalid, expired, or already used. Request a new link." };

export async function requestRecovery(auth: RecoveryAuth, input: unknown, origin: string): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  try {
    const { error } = await auth.resetPasswordForEmail(parsed.data.email, { redirectTo: new URL("/auth/reset-password", origin).href });
    if (error?.status === 429) return { status: "error", message: "Too many requests. Please wait before requesting another reset link.", retryAfterSeconds: 90 };
    if (error && !["user_not_found", "email_not_found"].includes(error.code ?? "")) return { status: "error", message: "Unable to request a reset link right now. Please try again later.", retryAfterSeconds: 90 };
    return { status: "success", message: "If this email is eligible for password recovery, a reset link will arrive shortly. Check your inbox and spam folder.", retryAfterSeconds: 90 };
  } catch { return { status: "error", message: "Unable to request a reset link right now. Please try again later." }; }
}

// Consume recovery tokens only on a deliberate form POST, not email-scanner GETs.
// A normal login session alone never authorizes this reset operation.
export async function resetPassword(auth: RecoveryAuth, input: unknown, token: unknown): Promise<AuthFormState> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  if (typeof token !== "string" || token.length < 1 || token.length > 4096) return invalidRecovery;
  let verified = false;
  try {
    const { data, error } = await auth.verifyOtp({ token_hash: token, type: "recovery" });
    if (error || !data.session || !data.user) return invalidRecovery;
    verified = true;
    const updated = await auth.updateUser({ password: parsed.data.password });
    if (updated.error) return { ...invalidRecovery, message: "The password could not be updated. Request a new reset link and choose a different strong password." };
    // Revoke refresh sessions on other devices after recovery.
    const signedOut = await auth.signOut({ scope: "global" });
    if (signedOut.error) return { status: "success", message: "Password updated. Sign in with your new password. Other sessions could not be revoked; contact support if your account was compromised." };
    return { status: "success", message: "Password updated successfully. Sign in with your new password." };
  } catch { return invalidRecovery; }
  finally { if (verified) await auth.signOut({ scope: "local" }).catch(() => undefined); }
}
