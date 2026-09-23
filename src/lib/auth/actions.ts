"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env/public";
import { login, register, logout, resendConfirmation, type AuthResult } from "@/lib/auth/service";
import type { AuthFormState } from "@/lib/auth/validation";
import { isEmailRegistered } from "@/lib/auth/email-lookup";

function finish(result: AuthResult): AuthFormState {
  if ("redirect" in result) {
    revalidatePath("/", "layout");
    redirect(result.redirect);
  }
  return result.state;
}

const unavailable: AuthFormState = { status: "error", message: "Account access is temporarily unavailable. Please try again later." };

export async function loginAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  let result: AuthResult;
  try {
    const client = await createClient("write");
    result = await login(client.auth, { email: formData.get("email"), password: formData.get("password") });
  } catch { return unavailable; }
  return finish(result);
}

export async function registerAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  let result: AuthResult;
  try {
    const client = await createClient("write");
    result = await register(client.auth, { email: formData.get("email"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") }, getPublicEnv().NEXT_PUBLIC_SITE_URL, isEmailRegistered);
  } catch { return unavailable; }
  return finish(result);
}

export async function logoutAction(): Promise<AuthFormState> {
  let result: AuthResult;
  try {
    const client = await createClient("write");
    result = await logout(client.auth);
  } catch { return unavailable; }
  return finish(result);
}

export async function resendConfirmationAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    const client = await createClient("write");
    return await resendConfirmation(client.auth, { email: formData.get("email") }, getPublicEnv().NEXT_PUBLIC_SITE_URL);
  } catch { return unavailable; }
}
