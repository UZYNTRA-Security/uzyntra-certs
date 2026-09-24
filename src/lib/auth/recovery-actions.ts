"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/metadata";
import { requestRecovery, resetPassword } from "./recovery";
import type { AuthFormState } from "./validation";
import { revalidatePath } from "next/cache";

export async function requestRecoveryAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  try { return await requestRecovery((await createClient("write")).auth, { email: form.get("email") }, getSiteUrl()); }
  catch { return { status: "error", message: "Account recovery is temporarily unavailable." }; }
}

export async function resetPasswordAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    const result = await resetPassword((await createClient("write")).auth, { password: form.get("password"), confirmPassword: form.get("confirmPassword") }, form.get("token_hash"));
    revalidatePath("/", "layout");
    return result;
  } catch { return { status: "error", message: "Account recovery is temporarily unavailable. Request a new link before retrying." }; }
}
