import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { AuthForm } from "@/components/auth/auth-form";
import { ConfirmationResend } from "@/components/auth/confirmation-resend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasSupabaseConfig } from "@/lib/env/public";

export const metadata = pageMetadata("Sign in", "Sign in securely to your UZYNTRA Certs account.", "/login", false);

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <PageIntro eyebrow="Account access" title="Welcome back." description="Sign in with your verified email address to access your UZYNTRA Certs account." />
    <Card className="mt-10 max-w-lg">
      <CardHeader><LockKeyhole aria-hidden="true" className="mb-3 size-8 text-primary" /><CardTitle className="text-xl">Sign in to UZYNTRA Certs</CardTitle></CardHeader>
      <CardContent><AuthForm mode="login" enabled={hasSupabaseConfig()} />
        <details className="mt-6 border-t pt-5"><summary className="cursor-pointer text-sm text-primary">Need another confirmation email?</summary><div className="mt-4"><ConfirmationResend enabled={hasSupabaseConfig()} /></div></details>
      </CardContent>
    </Card>
  </div>;
}
