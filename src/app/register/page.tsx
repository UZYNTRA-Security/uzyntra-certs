import { redirect } from "next/navigation";
import { UserRoundPlus } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasSupabaseConfig } from "@/lib/env/public";

export const metadata = pageMetadata("Create an account", "Create your UZYNTRA Certs account and verify your email address.", "/register", false);

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <PageIntro eyebrow="Join UZYNTRA Certs" title="Create your account." description="Start with your email address. We’ll send a confirmation link before you can sign in." />
    <Card className="mt-10 max-w-lg">
      <CardHeader><UserRoundPlus aria-hidden="true" className="mb-3 size-8 text-primary" /><CardTitle className="text-xl">Register</CardTitle></CardHeader>
      <CardContent><AuthForm mode="register" enabled={hasSupabaseConfig()} /></CardContent>
    </Card>
  </div>;
}
