"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { requestRecoveryAction, resetPasswordAction } from "@/lib/auth/recovery-actions";
import { initialAuthState } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecoveryForm({ token, enabled = true }: { token?: string; enabled?: boolean }) {
  const reset = token !== undefined;
  const [wait, setWait] = useState(0);
  const [state, action, pending] = useActionState(async (previous: typeof initialAuthState, form: FormData) => {
    const result = await (reset ? resetPasswordAction : requestRecoveryAction)(previous, form);
    if (!reset && result.retryAfterSeconds) setWait(result.retryAfterSeconds);
    return result;
  }, initialAuthState);
  useEffect(() => {
    const timer = window.setInterval(() => setWait((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // Keep email tokens out of subsequent browser history/referrer URLs.
  useEffect(() => { if (reset) window.history.replaceState(window.history.state, "", "/auth/reset-password"); }, [reset]);
  if (reset && (state.status === "success" || state.code === "INVALID_RECOVERY")) return <div className="space-y-5">
    <p role={state.status === "success" ? "status" : "alert"}>{state.message}</p>
    <Button asChild><Link href={state.status === "success" ? "/login" : "/forgot-password"}>{state.status === "success" ? "Sign in" : "Request a new reset link"}</Link></Button>
  </div>;
  const fields = reset ? ["password", "confirmPassword"] as const : ["email"] as const;
  return <form action={action} className="space-y-5" aria-busy={pending}>
    {reset && <input type="hidden" name="token_hash" value={token} />}
    {state.message && <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
    {!enabled && <p role="status">Account recovery is temporarily unavailable.</p>}
    {fields.map((name) => <div key={name} className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">{name === "email" ? "Email address" : name === "password" ? "New password" : "Confirm password"}</label>
      <Input id={name} name={name} type={name === "email" ? "email" : "password"} autoComplete={name === "email" ? "email" : "new-password"} minLength={name === "password" ? 12 : undefined} maxLength={name === "email" ? 254 : 128} required disabled={pending || !enabled} aria-invalid={!!state.errors?.[name]} aria-describedby={state.errors?.[name] ? `${name}-error` : undefined} />
      {state.errors?.[name] && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{state.errors[name]?.[0]}</p>}
    </div>)}
    {reset && <p className="text-sm text-muted-foreground">Use 12–128 characters with at least six distinct characters. A long, unique passphrase works well.</p>}
    <Button disabled={pending || wait > 0 || !enabled} type="submit">{pending ? "Please wait…" : wait > 0 ? `Try again in ${wait}s` : reset ? "Update password" : "Send reset link"}</Button>
    <p><Link className="text-sm text-primary underline" href="/login">Return to login</Link></p>
  </form>;
}
