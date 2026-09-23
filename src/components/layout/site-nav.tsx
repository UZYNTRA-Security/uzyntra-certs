"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/verify", label: "Verify" },
  { href: "/login", label: "Sign in" },
];

export function SiteNav() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="flex items-center gap-1">
    {links.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
      className={cn("rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pathname === href ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{label}</Link>)}
  </nav>;
}
