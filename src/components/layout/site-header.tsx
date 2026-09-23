import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteHeader() {
  return <header className="border-b bg-background/95">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-5">
      <Link href="/" className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="UZYNTRA Certs home">
        <span className="flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><ShieldCheck aria-hidden="true" className="size-6" /></span>
        <span><span className="block text-sm font-bold tracking-[0.18em]">UZYNTRA</span><span className="block text-xs text-muted-foreground">Credential verification</span></span>
      </Link>
      <SiteNav />
    </div>
  </header>;
}
