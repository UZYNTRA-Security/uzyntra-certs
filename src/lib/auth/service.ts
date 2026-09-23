import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loginSchema, registerSchema, type AuthFormState } from "./validation";
import { AppError } from "../errors";

export type AuthApi = Pick<SupabaseClient["auth"], "signInWithPassword" | "signUp" | "signOut" | "getUser" | "exchangeCodeForSession" | "verifyOtp">;
export type AuthResult = { redirect: "/dashboard" | "/login" } | { state: AuthFormState };

const unavailable: AuthFormState = { status: "error", message: "Account access is temporarily unavailable. Please try again later." };
export const confirmationMessage = "If this address is eligible, a confirmation email will arrive shortly. Check your inbox and spam folder, then follow the link to verify your email.";

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

export async function register(auth: AuthApi, input: unknown, origin: string): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { state: { status: "error", errors: parsed.error.flatten().fieldErrors } };
  try {
    const { email, password } = parsed.data;
    const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth/callback", origin).href } });
    if (error) {
      if (error.code === "user_already_exists") return { state: { status: "success", message: confirmationMessage } };
      return { state: { status: "error", message: error.status === 429 ? "Too many requests. Please wait before trying again." : "Unable to create an account right now. Please try again later." } };
    }
    // Never silently enroll a user when the project has email verification disabled.
    if (data.session) {
      await auth.signOut({ scope: "local" });
      return { state: unavailable };
    }
    return { state: { status: "success", message: confirmationMessage } };
  } catch { return { state: unavailable }; }
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
