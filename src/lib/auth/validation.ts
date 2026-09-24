import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254, "Email is too long.");
const password = z.string().min(1, "Enter your password.").max(128, "Use at most 128 characters.");

export const loginSchema = z.object({ email, password });
export const resendSchema = z.object({ email });
export const RESEND_COOLDOWN_SECONDS = 90;
export const registerSchema = z.object({
  email,
  password: password.min(12, "Use at least 12 characters."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"], message: "Passwords must match.",
});

export type AuthFormState = {
  status: "idle" | "error" | "success";
  code?: "EMAIL_ALREADY_REGISTERED" | "EMAIL_UNVERIFIED" | "INVALID_RECOVERY" | "MISSING_RECOVERY_SESSION";
  message?: string;
  email?: string;
  retryAfterSeconds?: number;
  errors?: Partial<Record<"email" | "password" | "confirmPassword", string[]>>;
};

export const initialAuthState: AuthFormState = { status: "idle" };

export const passwordResetSchema = z.object({
  password: password.min(8, "Use at least 8 characters."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords must match." });
