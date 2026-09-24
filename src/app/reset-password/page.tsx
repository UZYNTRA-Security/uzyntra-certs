import { RecoveryCallback } from "@/components/auth/recovery-callback";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";
import { hasSupabaseConfig } from "@/lib/env/public";
import { recoveryProofFromUrl } from "@/lib/auth/recovery-link";

export const metadata = pageMetadata("Reset password", "Choose a new password for your UZYNTRA Certs account.", "/reset-password", false);
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const proof = recoveryProofFromUrl(params);
  return <div className="mx-auto max-w-lg space-y-6 px-6 py-20"><p className="font-mono text-xs uppercase tracking-widest text-primary">UZYNTRA Certs / Account recovery</p><h1 className="text-3xl font-semibold">Reset your password</h1>
    <Card><CardHeader><CardTitle>Choose a new password</CardTitle></CardHeader><CardContent>
      <RecoveryCallback proof={proof} resume={Object.keys(params).length === 0} enabled={hasSupabaseConfig()} />
    </CardContent></Card>
  </div>;
}
