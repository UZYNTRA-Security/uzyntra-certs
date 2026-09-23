import { ShieldCheck } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageIntro } from "@/components/layout/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Your account", "Your secure UZYNTRA Certs account.", "/dashboard", false);

export default async function DashboardPage() {
  const user = await requirePageUser();
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <PageIntro eyebrow="Your account" title="You’re signed in." description="Your email has been verified. This is your account entry point; credential features are still in development." />
    <Card className="mt-10 max-w-xl">
      <CardHeader><ShieldCheck aria-hidden="true" className="mb-3 size-8 text-primary" /><CardTitle>Account access</CardTitle><CardDescription>Signed in as <span className="break-all text-foreground">{user.email}</span></CardDescription></CardHeader>
      <CardContent><LogoutButton /></CardContent>
    </Card>
  </div>;
}
