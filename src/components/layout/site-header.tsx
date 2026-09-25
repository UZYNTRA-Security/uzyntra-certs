import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteHeader() {
  return <header className="border-b bg-background/95">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-5">
      <Link href="/" className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="UZYNTRA Certs home">
        <Image src="/brand/verification-badge.svg" width={40} height={40} alt="" />
        <span><span className="block text-sm font-bold tracking-[0.18em]">UZYNTRA CERTS</span><span className="block text-xs text-muted-foreground">by UZYNTRA Security</span></span>
      </Link>
      <SiteNav />
    </div>
  </header>;
}
