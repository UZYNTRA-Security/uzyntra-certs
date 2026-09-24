"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { requestRecoveryAction, resetPasswordAction } from "@/lib/auth/recovery-actions";
import { initialAuthState, passwordResetSchema } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecoveryForm({ resetSession = false, enabled = true }: { resetSession?: boolean; enabled?: boolean }) {
  const reset = resetSession;
  const router = useRouter();
  const [wait, setWait] = useState(0);
  const [state, action, pending] = useActionState(async (previous: typeof initialAuthState, form: FormData): Promise<typeof initialAuthState> => {
    if (reset) {
      const parsed = passwordResetSchema.safeParse(Object.fromEntries(form));
      if (!parsed.success) return { status: "error" as const, errors: parsed.error.flatten().fieldErrors };
    }
    try {
      const result = await (reset ? resetPasswordAction : requestRecoveryAction)(previous, form);
      if (!reset && result.retryAfterSeconds) setWait(result.retryAfterSeconds);
      return result;
    } catch { return { status: "error" as const, message: "Unable to connect. Check your connection and try again." }; }
  }, initialAuthState);
  useEffect(() => {
    const timer = window.setInterval(() => setWait((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!reset || state.status !== "success") return;
    const timeout = window.setTimeout(() => { router.replace("/login"); router.refresh(); }, 2500);
    return () => window.clearTimeout(timeout);
  }, [reset, state.status, router]);
  if (reset && (state.status === "success" || state.code === "INVALID_RECOVERY" || state.code === "MISSING_RECOVERY_SESSION")) return <div className="space-y-5">
    <p role={state.status === "success" ? "status" : "alert"}>{state.message}</p>
    <Button asChild><Link href={state.status === "success" ? "/login" : "/forgot-password"}>{state.status === "success" ? "Sign in" : "Request a new reset link"}</Link></Button>
  </div>;
  const fields = reset ? ["password", "confirmPassword"] as const : ["email"] as const;
  return <form action={action} className="space-y-5" aria-busy={pending}>
    {state.message && <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
    {!enabled && <p role="status">Account recovery is temporarily unavailable.</p>}
    {fields.map((name) => <div key={name} className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">{name === "email" ? "Email address" : name === "password" ? "New password" : "Confirm password"}</label>
      <Input id={name} name={name} type={name === "email" ? "email" : "password"} autoComplete={name === "email" ? "email" : "new-password"} minLength={name === "password" ? 8 : undefined} maxLength={name === "email" ? 254 : 128} required disabled={pending || !enabled} aria-invalid={!!state.errors?.[name]} aria-describedby={state.errors?.[name] ? `${name}-error` : undefined} />
      {state.errors?.[name] && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{state.errors[name]?.[0]}</p>}
    </div>)}
    {reset && <p className="text-sm text-muted-foreground">Use 8–128 characters. Both passwords must match.</p>}
    <Button disabled={pending || wait > 0 || !enabled} type="submit">{pending ? "Please wait…" : wait > 0 ? `Try again in ${wait}s` : reset ? "Update password" : "Send reset link"}</Button>
    <p><Link className="text-sm text-primary underline" href="/login">Return to login</Link></p>
  </form>;
}
