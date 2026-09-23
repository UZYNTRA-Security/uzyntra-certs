import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function SiteHeader() {
  return <header className="border-b border-border">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
      <Link href="/" className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="UZYNTRA Certs home">
        <span className="flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><ShieldCheck aria-hidden="true" className="size-6" /></span>
        <span className="font-semibold tracking-widest">UZYNTRA <span className="font-normal tracking-normal text-muted-foreground">/ Certs</span></span>
      </Link>
      <span className="rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground">In development</span>
    </div>
  </header>;
}
