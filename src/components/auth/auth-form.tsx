"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { loginAction, registerAction } from "@/lib/auth/actions";
import { initialAuthState, loginSchema, registerSchema, type AuthFormState } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationResend } from "@/components/auth/confirmation-resend";
import { emailProviderUrl } from "@/lib/auth/cooldown";

export function AuthForm({ mode, enabled }: { mode: "login" | "register"; enabled: boolean }) {
  const registration = mode === "register";
  const [state, action, pending] = useActionState(registration ? registerAction : loginAction, initialAuthState);
  const [clientErrors, setClientErrors] = useState<AuthFormState["errors"]>();
  const errors = clientErrors ?? state.errors;

  function validate(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const schema = registration ? registerSchema : loginSchema;
    const result = schema.safeParse(Object.fromEntries(data));
    if (!result.success) {
      event.preventDefault();
      setClientErrors(result.error.flatten().fieldErrors);
    } else setClientErrors(undefined);
  }

  if (state.status === "success") return <div className="space-y-5">
    <h2 className="text-xl font-semibold">Check your email</h2>
    <p role="status" className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>
    {emailProviderUrl(state.email) && <Button asChild variant="outline"><a href={emailProviderUrl(state.email)} target="_blank" rel="noopener noreferrer">Open email provider</a></Button>}
    <details><summary className="cursor-pointer text-sm text-primary">Didn&apos;t receive the email?</summary><div className="mt-4"><ConfirmationResend email={state.email} initialWait={state.retryAfterSeconds} enabled={enabled} /></div></details>
    <Button asChild variant="outline"><Link href="/login">Return to sign in</Link></Button>
  </div>;

  const fields = [
    { name: "email" as const, label: "Email address", type: "email", autoComplete: "email", placeholder: "you@example.com", maxLength: 254 },
    { name: "password" as const, label: "Password", type: "password", autoComplete: registration ? "new-password" : "current-password", placeholder: registration ? "At least 12 characters" : "Enter your password", maxLength: 128 },
    ...(registration ? [{ name: "confirmPassword" as const, label: "Confirm password", type: "password", autoComplete: "new-password", placeholder: "Re-enter your password", maxLength: 128 }] : []),
  ];

  return <div className="space-y-5"><form action={action} onSubmit={validate} noValidate className="space-y-5" aria-busy={pending}>
    {!enabled && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">Account access is temporarily unavailable. Please try again later.</p>}
    {state.message && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">{state.message}</p>}
    <fieldset disabled={pending || !enabled} className="space-y-5">
      <legend className="sr-only">{registration ? "Create an account" : "Sign in to your account"}</legend>
      {fields.map((field) => <div key={field.name} className="space-y-2">
        <label htmlFor={field.name} className="block text-sm font-medium">{field.label}</label>
        <Input id={field.name} name={field.name} type={field.type} autoComplete={field.autoComplete} placeholder={field.placeholder} maxLength={field.maxLength} required
          minLength={field.name === "password" && registration ? 12 : undefined}
          autoCapitalize={field.name === "email" ? "none" : undefined}
          spellCheck={false} aria-invalid={Boolean(errors?.[field.name]?.length)} aria-describedby={errors?.[field.name]?.length ? field.name + "-error" : undefined} />
        {errors?.[field.name]?.length ? <p id={field.name + "-error"} className="text-sm text-destructive" role="alert">{errors[field.name]![0]}</p> : null}
      </div>)}
      {registration && <p className="text-xs leading-relaxed text-muted-foreground">Use 12–128 characters. You must confirm your email before accessing your account.</p>}
      <Button type="submit" className="w-full" disabled={pending || !enabled}>{pending ? (registration ? "Creating account…" : "Signing in…") : (registration ? "Create account" : "Sign in")}</Button>
    </fieldset>
    <p className="text-sm text-muted-foreground">{registration ? "Already have an account? " : "New to UZYNTRA Certs? "}<Link className="text-primary underline underline-offset-4" href={registration ? "/login" : "/register"}>{registration ? "Sign in" : "Create an account"}</Link></p>
  </form>
    {registration && state.code === "EMAIL_ALREADY_REGISTERED" && <div className="space-y-4 border-t pt-5">
      <Button asChild variant="outline"><Link href="/login">Sign in to your account</Link></Button>
      <Button asChild variant="outline"><Link href="/forgot-password">Forgot password</Link></Button>
    </div>}
    {registration && state.code === "EMAIL_UNVERIFIED" && <div className="space-y-4 border-t pt-5"><p className="text-sm">Didn&apos;t receive the email?</p><ConfirmationResend key={state.email} email={state.email} enabled={enabled} /></div>}
    {!registration && <Link href="/forgot-password" className="text-sm text-primary underline">Forgot password?</Link>}
  </div>;
}
