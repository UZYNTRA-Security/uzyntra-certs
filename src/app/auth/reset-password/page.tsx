import Link from "next/link";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { pageMetadata } from "@/lib/metadata";
import { hasSupabaseConfig } from "@/lib/env/public";

export const metadata = pageMetadata("Reset password", "Choose a new password for your UZYNTRA Certs account.", "/auth/reset-password", false);
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = params.token_hash;
  const valid = typeof token === "string" && token.length > 0 && token.length <= 4096 && params.type === "recovery" && !params.error && !params.code;
  return <div className="mx-auto max-w-lg space-y-6 px-6 py-20"><h1 className="text-3xl font-semibold">Reset your password</h1>
    {valid ? <><p className="text-sm text-muted-foreground">Your link will be validated when you submit your new password.</p><RecoveryForm token={token} enabled={hasSupabaseConfig()} /></> : <><p role="alert">This reset link is invalid or incomplete. Request a new email and use its reset link.</p><Link href="/forgot-password" className="text-primary underline">Request a new reset link</Link></>}
  </div>;
}
