import { ArrowUpRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <div className="max-w-3xl">
      <p className="mb-7 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> UZYNTRA Security / Digital credentials</p>
      <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight sm:text-7xl">Recognition.<br /><span className="text-muted-foreground">Built on trust.</span></h1>
      <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">A dedicated home for UZYNTRA credentials. We’re building a secure way to verify achievements and professional recognition.</p>
      <Button asChild variant="outline" className="mt-8"><a href="https://uzyntra.com">Explore UZYNTRA <ArrowUpRight aria-hidden="true" /></a></Button>
    </div>
    <Card className="mt-16 max-w-3xl sm:mt-24">
      <CardHeader><div className="mb-3 text-primary"><Fingerprint aria-hidden="true" className="size-7" /></div><CardTitle>Setting the foundation</CardTitle><CardDescription>The platform is in development. Credential verification is not available yet.</CardDescription></CardHeader>
      <CardContent><p className="text-sm leading-relaxed text-muted-foreground">Future support is planned for course certificates, internships, employment verification, contributions, bug bounty recognition, and appreciation awards.</p></CardContent>
    </Card>
  </div>;
}
