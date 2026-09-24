"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { resendConfirmationAction } from "@/lib/auth/actions";
import { initialAuthState, RESEND_COOLDOWN_SECONDS } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { remainingSeconds, cooldownLabel } from "@/lib/auth/cooldown";

const storageKey = "uzyntra-confirmation-retry-at";

export function ConfirmationResend({ email, initialWait = 0, enabled = true }: { email?: string; initialWait?: number; enabled?: boolean }) {
  const [remaining, setRemaining] = useState(initialWait);
  const deadline = useRef(0);

  function startCooldown(seconds: number) {
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    try { sessionStorage.setItem(storageKey, String(deadline.current)); } catch { /* Storage may be unavailable. */ }
  }

  const [state, action, pending] = useActionState(async (previous: typeof initialAuthState, data: FormData) => {
    if (deadline.current > Date.now()) return previous;
    startCooldown(RESEND_COOLDOWN_SECONDS);
    const result = await resendConfirmationAction(previous, data);
    if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
    return result;
  }, initialAuthState);

  useEffect(() => {
    let stored = 0;
    try { stored = Number(sessionStorage.getItem(storageKey)) || 0; } catch { /* Use the in-memory timer. */ }
    deadline.current = Math.max(deadline.current, stored, Date.now() + initialWait * 1000);
    try { sessionStorage.setItem(storageKey, String(deadline.current)); } catch { /* Use the in-memory timer. */ }
    const tick = () => setRemaining(remainingSeconds(deadline.current));
    // Schedule the initial update rather than synchronously setting effect state.
    const timeout = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(timeout); window.clearInterval(timer); };
  }, [initialWait]);


  return <form id="resend-confirmation" action={action} className="space-y-4" aria-busy={pending}>
    <div className="space-y-2">
      <label htmlFor="confirmation-email" className="block text-sm font-medium">Confirmation email address</label>
      <Input id="confirmation-email" name="email" type="email" defaultValue={email} autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} disabled={pending || !enabled}
        aria-invalid={Boolean(state.errors?.email)} aria-describedby={state.errors?.email ? "confirmation-email-error" : undefined} />
      {state.errors?.email && <p id="confirmation-email-error" role="alert" className="text-sm text-destructive">{state.errors.email[0]}</p>}
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">If this email is already registered and verified, sign in. Resending is for accounts that still need email confirmation.</p>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>}
    <Button type="submit" variant="outline" disabled={pending || remaining > 0 || !enabled}>
      {pending ? "Requesting email…" : remaining > 0 ? `Resend in ${cooldownLabel(remaining)}` : "Resend confirmation email"}
    </Button>
    {remaining > 0 && <p className="text-xs text-muted-foreground">You can request another email once the 90-second countdown finishes.</p>}
  </form>;
}
