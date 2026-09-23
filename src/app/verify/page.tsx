import Link from "next/link";
import { ArrowLeft, SearchCheck } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Verify a credential", "The future home of public UZYNTRA credential verification. Verification is not available in this release.", "/verify", false);

export default function VerifyPage() {
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <PageIntro eyebrow="Credential verification" title="A place to check the details." description="This will be the starting point for reviewing credentials issued by UZYNTRA Security." />
    <Card className="mt-12 max-w-2xl">
      <CardHeader><SearchCheck aria-hidden="true" className="mb-5 size-10 text-primary" /><p className="font-mono text-xs uppercase tracking-widest text-primary">Coming soon</p><CardTitle className="text-2xl">Verification is not available yet</CardTitle><CardDescription>We’re preparing the verification experience. This page cannot look up a credential or confirm its validity in the current release.</CardDescription></CardHeader>
      <CardContent><p className="mb-6 text-sm leading-relaxed text-muted-foreground">If you need information about an existing UZYNTRA credential, use the contact details provided by its issuer.</p><Button asChild variant="outline"><Link href="/"><ArrowLeft aria-hidden="true" /> Back to home</Link></Button></CardContent>
    </Card>
  </div>;
}
