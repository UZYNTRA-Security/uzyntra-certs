import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return <footer className="border-t">
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-sm"><p className="flex items-center gap-2 font-semibold"><ShieldCheck aria-hidden="true" className="size-4 text-primary" /> UZYNTRA Certs</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">A dedicated home for achievements and professional recognition from UZYNTRA Security.</p></div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <Link className="hover:text-primary" href="/about">About</Link>
          <Link className="hover:text-primary" href="/verify">Verification</Link>
          <a className="inline-flex items-center gap-1 hover:text-primary" href="https://uzyntra.com">UZYNTRA Security <ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
        </nav>
      </div>
      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
        <p>© UZYNTRA Security. All rights reserved.</p><p>Public credential verification · UZYNTRA Security</p>
      </div>
    </div>
  </footer>;
}
