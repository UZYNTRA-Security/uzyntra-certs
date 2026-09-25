import Link from "next/link";

const links = [
  ["/admin", "Overview"],
  ["/admin/organizations", "Organizations"],
  ["/admin/members", "Members"],
  ["/admin/credentials", "Credentials"],
  ["/admin/badges", "Badges"],
  ["/admin/audit", "Audit Logs"],
];

export function AdminNav() {
  return <nav aria-label="Admin navigation" className="flex flex-wrap gap-2">
    {links.map(([href, label]) => <Link key={href} href={href} className="rounded-md border px-3 py-2 text-sm hover:border-primary/40 hover:text-primary">{label}</Link>)}
  </nav>;
}
