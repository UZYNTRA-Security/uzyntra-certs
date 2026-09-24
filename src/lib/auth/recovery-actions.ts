"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/metadata";
import { requestRecovery, exchangeRecovery, updateRecoveredPassword } from "./recovery";
import type { AuthFormState } from "./validation";
import { revalidatePath } from "next/cache";
import { recoveryOrigin } from "./recovery-link";
import { cookies } from "next/headers";
import { issueRecoveryGrant, validRecoveryGrant, recoveryGrantLifetime } from "./recovery-grant";

const grantCookie = "uzyntra-recovery-grant";
function grantSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret?.startsWith("sb_secret_")) throw new Error("Recovery configuration unavailable");
  return secret;
}

export async function beginRecoveryAction(proof: unknown): Promise<AuthFormState> {
  try {
    const secret = grantSecret();
    const cookieStore = await cookies();
    cookieStore.delete(grantCookie);
    const client = await createClient("write");
    const result = await exchangeRecovery(client.auth, proof);
    if (!result.ok) return result.state;
    cookieStore.set(grantCookie, issueRecoveryGrant(result.session.user.id, result.session.access_token, secret), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: recoveryGrantLifetime });
    return { status: "success" };
  } catch { return { status: "error", message: "Unable to establish a recovery session. Check your connection and request a new reset link." }; }
}

export async function resumeRecoveryAction(): Promise<AuthFormState> {
  try {
    const cookieStore = await cookies();
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    const { data: { session } } = await client.auth.getSession();
    if (!error && user && session && validRecoveryGrant(cookieStore.get(grantCookie)?.value, user.id, session.access_token, grantSecret())) return { status: "success" };
    return { status: "error", code: "MISSING_RECOVERY_SESSION", message: "Your recovery session is missing or expired. Request a new reset link." };
  } catch { return { status: "error", message: "Unable to verify your recovery session. Check your connection and try again." }; }
}

export async function requestRecoveryAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  try { return await requestRecovery((await createClient("write")).auth, { email: form.get("email") }, recoveryOrigin(getSiteUrl(), process.env.NODE_ENV === "development")); }
  catch { return { status: "error", message: "Account recovery is temporarily unavailable." }; }
}

export async function resetPasswordAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    const client = await createClient("write");
    const cookieStore = await cookies();
    const { data: { user }, error } = await client.auth.getUser();
    const { data: { session } } = await client.auth.getSession();
    if (error || !user || !session || !validRecoveryGrant(cookieStore.get(grantCookie)?.value, user.id, session.access_token, grantSecret())) {
      cookieStore.delete(grantCookie);
      return { status: "error", code: "MISSING_RECOVERY_SESSION", message: "Your recovery session is missing or expired. Request a new reset link." };
    }
    const result = await updateRecoveredPassword(client.auth, { password: form.get("password"), confirmPassword: form.get("confirmPassword") });
    if (result.status === "success") cookieStore.delete(grantCookie);
    revalidatePath("/", "layout");
    return result;
  } catch { return { status: "error", message: "Account recovery is temporarily unavailable. Request a new link before retrying." }; }
}
