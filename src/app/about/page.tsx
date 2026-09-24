import Link from "next/link";
import { ArrowRight, Eye, Fingerprint, ShieldCheck } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("About", "Learn about UZYNTRA Certs, the purpose of the platform, and our approach to digital credential verification.", "/about");

export default function AboutPage() {
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <PageIntro eyebrow="About UZYNTRA Certs" title="Recognition deserves a trusted home." description="UZYNTRA Certs is the digital credential platform being developed by UZYNTRA Security to bring achievements and professional recognition into one place." />
    <section aria-labelledby="purpose-heading" className="my-14 grid gap-8 border-y py-10 md:grid-cols-2">
      <h2 id="purpose-heading" className="text-2xl font-semibold">Built for the people behind the achievement.</h2>
      <div className="space-y-4 text-sm leading-7 text-muted-foreground"><p>Our aim is to help recipients share their recognition and give others a clear way to understand credentials issued by UZYNTRA Security.</p><p>The platform will support course certificates, internships, employment verification, contributions, bug bounty recognition, and appreciation awards. Public verification shows issuer-approved details for published credentials. Issuing tools are planned for a later release.</p></div>
    </section>
    <section aria-label="Design principles" className="grid gap-4 md:grid-cols-3">
      {[{ icon: ShieldCheck, title: "Security by design", text: "Access controls and careful handling of information will guide each stage of development." }, { icon: Eye, title: "Clear context", text: "Credential information should be understandable to recipients and the people reviewing it." }, { icon: Fingerprint, title: "Respect for privacy", text: "Public recognition should be supported by deliberate choices about what information is shared." }].map(({ icon: Icon, title, text }) => <Card key={title}><CardHeader><Icon aria-hidden="true" className="mb-4 size-6 text-primary" /><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader></Card>)}
    </section>
    <div className="mt-12"><Button asChild variant="outline"><Link href="/verify">Verify a credential <ArrowRight aria-hidden="true" /></Link></Button></div>
  </div>;
}
