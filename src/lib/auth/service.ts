import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loginSchema, registerSchema, resendSchema, RESEND_COOLDOWN_SECONDS, type AuthFormState } from "./validation";
import { AppError } from "../errors";

export type AuthApi = Pick<SupabaseClient["auth"], "signInWithPassword" | "signUp" | "signOut" | "getUser" | "exchangeCodeForSession" | "verifyOtp" | "resend">;
export type AuthResult = { redirect: "/dashboard" | "/login" } | { state: AuthFormState };

const unavailable: AuthFormState = { status: "error", message: "Account access is temporarily unavailable. Please try again later." };
export const confirmationMessage = "If this email needs verification, a confirmation link will arrive shortly. Check your inbox and spam folder. If this email is already registered and verified, sign in instead.";
export const alreadyRegisteredMessage = "This email is already registered. Sign in, or resend the confirmation email if you have not verified it yet.";
const alreadyRegistered = (email: string): AuthResult => ({ state: { status: "error", code: "EMAIL_ALREADY_REGISTERED", message: alreadyRegisteredMessage, email } });

export async function login(auth: AuthApi, input: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { state: { status: "error", errors: parsed.error.flatten().fieldErrors } };
  try {
    const { data, error } = await auth.signInWithPassword(parsed.data);
    if (error || !data.session || !data.user) return { state: { status: "error", message: "Unable to sign in. Check your email and password, and confirm your email before trying again." } };
    if (!data.user.email_confirmed_at) {
      await auth.signOut({ scope: "local" });
      return { state: { status: "error", message: "Verify your email before signing in." } };
    }
    return { redirect: "/dashboard" };
  } catch { return { state: unavailable }; }
}

export async function register(auth: AuthApi, input: unknown, origin: string, emailExists: (email: string) => Promise<boolean>): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { state: { status: "error", errors: parsed.error.flatten().fieldErrors } };
  try {
    const { password } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    if (await emailExists(email)) return alreadyRegistered(email);
    const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth/callback", origin).href } });
    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") return alreadyRegistered(email);
      return { state: { status: "error", message: error.status === 429 ? "Too many requests. Please wait before trying again." : "Unable to create an account right now. Please try again later." } };
    }
    // Never silently enroll a user when the project has email verification disabled.
    if (data.session) {
      await auth.signOut({ scope: "local" });
      return { state: unavailable };
    }
    // Supabase may obfuscate existing confirmed users instead of returning an error.
    if (data.user?.identities?.length === 0) return alreadyRegistered(email);
    return { state: { status: "success", message: "A confirmation email has been requested. Check your inbox and spam folder, then follow the link to verify your email.", email, retryAfterSeconds: RESEND_COOLDOWN_SECONDS } };
  } catch { return { state: unavailable }; }
}

export async function resendConfirmation(auth: AuthApi, input: unknown, origin: string): Promise<AuthFormState> {
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  try {
    const { error } = await auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: new URL("/auth/callback", origin).href } });
    if (error?.status === 429 || error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
      return { status: "error", message: "Too many email requests. Wait at least 90 seconds before trying again. Email delivery limits may require a longer wait.", retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
    }
    if (error && !["user_not_found", "email_not_found", "email_already_confirmed", "user_already_exists"].includes(error.code ?? "")) {
      return { status: "error", message: "Unable to request a confirmation email right now. Please try again later.", retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
    }
    return { status: "success", message: confirmationMessage, retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
  } catch {
    return { status: "error", message: "Unable to request a confirmation email right now. Please try again later.", retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
  }
}

export async function logout(auth: AuthApi): Promise<AuthResult> {
  try {
    const { error } = await auth.signOut({ scope: "local" });
    if (error) return { state: { status: "error", message: "Unable to sign out. Please try again." } };
    return { redirect: "/login" };
  } catch { return { state: unavailable }; }
}

export async function verifiedUser(auth: AuthApi): Promise<User | null> {
  const { data, error } = await auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403 || error.code === "refresh_token_not_found") return null;
    throw new AppError("AUTH_UNAVAILABLE", "Authentication is temporarily unavailable.", 503);
  }
  return data.user?.email_confirmed_at ? data.user : null;
}

export async function completeCallback(auth: AuthApi, params: URLSearchParams): Promise<"/dashboard" | "/auth/error"> {
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (params.has("error") || Boolean(code) === Boolean(tokenHash)) return "/auth/error";
  if (params.getAll("code").length > 1 || params.getAll("token_hash").length > 1 || params.getAll("type").length > 1) return "/auth/error";
  try {
    if ((code && code.length > 4096) || (tokenHash && tokenHash.length > 4096)) return "/auth/error";
    if (tokenHash && type !== "email" && type !== "signup") return "/auth/error";
    const { data, error } = code
      ? await auth.exchangeCodeForSession(code)
      : await auth.verifyOtp({ token_hash: tokenHash!, type: type as "email" | "signup" });
    if (error || !data.session || !data.user?.email_confirmed_at) {
      if (data.session) await auth.signOut({ scope: "local" });
      return "/auth/error";
    }
    // Ignore all request-provided redirect destinations.
    return "/dashboard";
  } catch { return "/auth/error"; }
}
