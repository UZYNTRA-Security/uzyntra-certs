"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { beginRecoveryAction, resumeRecoveryAction } from "@/lib/auth/recovery-actions";
import { RecoveryForm } from "./recovery-form";
import type { RecoveryProof } from "@/lib/auth/recovery-link";
import type { AuthFormState } from "@/lib/auth/validation";

export function RecoveryCallback({ proof, enabled, resume = false }: { proof: RecoveryProof | null; enabled: boolean; resume?: boolean }) {
  const exchange = useRef<Promise<AuthFormState> | null>(null);
  const [state, setState] = useState<AuthFormState>({ status: "idle" });
  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (!enabled) return;
    // Reuse the promise across Strict Mode's effect replay; codes are single-use.
    exchange.current ??= (proof ? beginRecoveryAction(proof) : resume ? resumeRecoveryAction() : Promise.resolve<AuthFormState>({ status: "error", code: "INVALID_RECOVERY", message: "This reset link is invalid, expired, or missing its recovery code. Request a new link to continue." })).catch(() => ({ status: "error", message: "Unable to connect. Request a new reset link and try again." }));
    let active = true;
    void exchange.current.then((result) => { if (active) setState(result); });
    return () => { active = false; };
  }, [proof, enabled, resume]);
  if (!enabled) return <div className="space-y-4"><p role="alert">Account recovery is temporarily unavailable.</p><Link href="/forgot-password" className="text-primary underline">Request a new reset link</Link></div>;
  if (state.status === "idle") return <p role="status">Validating your recovery link…</p>;
  if (state.status !== "success") return <div className="space-y-4"><p role="alert">{state.message}</p><Link href="/forgot-password" className="text-primary underline">Request a new reset link</Link></div>;
  return <RecoveryForm resetSession enabled={enabled} />;
}
