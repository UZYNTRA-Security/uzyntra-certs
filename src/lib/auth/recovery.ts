import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { passwordResetSchema, resendSchema, type AuthFormState } from "./validation";
import { recoveryProofSchema } from "./recovery-link";

type RecoveryAuth = Pick<SupabaseClient["auth"], "resetPasswordForEmail" | "exchangeCodeForSession" | "verifyOtp" | "updateUser" | "signOut">;
export const invalidRecovery: AuthFormState = { status: "error", code: "INVALID_RECOVERY", message: "This reset link is invalid, expired, or already used. Request a new link." };
const missingSession: AuthFormState = { status: "error", code: "MISSING_RECOVERY_SESSION", message: "The recovery session is missing. Open the link in the browser where you requested it, or request a new reset link." };
const networkFailure: AuthFormState = { status: "error", message: "Unable to contact the authentication service. Check your connection and try again. If the link was already used, request a new one." };
function isNetworkFailure(error: { name?: string; status?: number }) { return error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500; }

export async function requestRecovery(auth: RecoveryAuth, input: unknown, origin: string): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  try {
    const { error } = await auth.resetPasswordForEmail(parsed.data.email, { redirectTo: new URL("/reset-password", origin).href });
    if (error?.status === 429) return { status: "error", message: "Too many requests. Please wait before requesting another reset link.", retryAfterSeconds: 90 };
    if (error && !["user_not_found", "email_not_found"].includes(error.code ?? "")) return { status: "error", message: "Unable to request a reset link right now. Please try again later.", retryAfterSeconds: 90 };
    return { status: "success", message: "If this email is eligible for password recovery, a reset link will arrive shortly. Check your inbox and spam folder.", retryAfterSeconds: 90 };
  } catch { return { status: "error", message: "Unable to request a reset link right now. Please try again later." }; }
}


export type RecoveryExchange = { ok: true; session: Session } | { ok: false; state: AuthFormState };
export async function exchangeRecovery(auth: RecoveryAuth, proofInput: unknown): Promise<RecoveryExchange> {
  const proof = recoveryProofSchema.safeParse(proofInput);
  if (!proof.success) return { ok: false, state: invalidRecovery };
  try {
    const { data, error } = proof.data.kind === "token"
      ? await auth.verifyOtp({ token_hash: proof.data.value, type: "recovery" })
      : await auth.exchangeCodeForSession(proof.data.value, proof.data.flowId ? { flowId: proof.data.flowId } : undefined);
    if (error) {
      if (isNetworkFailure(error)) return { ok: false, state: networkFailure };
      if (error.name === "AuthPKCECodeVerifierMissingError" || error.code === "flow_state_not_found" || error.code === "bad_code_verifier") return { ok: false, state: missingSession };
      return { ok: false, state: invalidRecovery };
    }
    if (!data.session || !data.user) return { ok: false, state: missingSession };
    if (proof.data.kind === "code" && (!("redirectType" in data) || data.redirectType !== "recovery")) {
      await auth.signOut({ scope: "local" });
      return { ok: false, state: invalidRecovery };
    }
    return { ok: true, session: data.session };
  } catch { return { ok: false, state: networkFailure }; }
}

// Call only after validating the server-issued recovery grant for this session.
export async function updateRecoveredPassword(auth: RecoveryAuth, input: unknown): Promise<AuthFormState> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  try {
    const updated = await auth.updateUser({ password: parsed.data.password });
    if (updated.error) return isNetworkFailure(updated.error) ? networkFailure : { status: "error", message: "The password could not be updated. Choose a different password that meets the project's password policy." };
    const signedOut = await auth.signOut({ scope: "global" }).catch(() => ({ error: true }));
    await auth.signOut({ scope: "local" }).catch(() => undefined);
    return { status: "success", message: "Password updated successfully. You can now sign in." + (signedOut.error ? " Other sessions could not be revoked; contact support if your account was compromised." : "") };
  } catch { return networkFailure; }
}

// Combined service kept for SDK-level tests and callers holding fresh recovery proof.
export async function resetPassword(auth: RecoveryAuth, input: unknown, proofInput: unknown): Promise<AuthFormState> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const exchange = await exchangeRecovery(auth, proofInput);
  if (!exchange.ok) return exchange.state;
  try { return await updateRecoveredPassword(auth, parsed.data); }
  finally { await auth.signOut({ scope: "local" }).catch(() => undefined); }
}
