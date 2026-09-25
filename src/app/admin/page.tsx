import Link from "next/link";
import { requireIssuer } from "@/lib/issuer/guards";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Administration", "UZYNTRA Certs administration foundation.", "/admin", false);

export default async function AdminPage() {
  const { organization } = await requireIssuer(["ADMIN"]);
  return <main className="mx-auto max-w-5xl px-6 py-16"><section className="rounded-2xl border bg-card p-8 shadow-sm"><p className="text-xs uppercase tracking-[.2em] text-primary">Platform administration</p><h1 className="mt-3 text-3xl font-semibold">{organization.name}</h1><p className="mt-3 max-w-2xl text-muted-foreground">This protected foundation reserves the administration route for organization administrators. Partner onboarding, billing, API access, and white-label controls will be added in later phases.</p><Link className="mt-6 inline-flex rounded-md border px-4 py-2 text-sm hover:border-primary/40 hover:text-primary" href="/issuer/members">Review organization members</Link></section></main>;
}
