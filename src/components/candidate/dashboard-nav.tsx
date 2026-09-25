"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound, Award, ShieldCheck, BadgeCheck } from "lucide-react";
const links = [["/dashboard", "Overview", LayoutDashboard], ["/dashboard/profile", "My profile", UserRound], ["/dashboard/credentials", "Credentials", ShieldCheck], ["/dashboard/badges", "Badges", Award], ["/dashboard/security", "Security", BadgeCheck]] as const;
export function DashboardNav() {
  const path = usePathname();
  return <nav aria-label="Candidate dashboard" className="flex flex-wrap gap-1 lg:flex-col">{links.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${path === href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" aria-hidden />{label}</Link>)}</nav>;
}
