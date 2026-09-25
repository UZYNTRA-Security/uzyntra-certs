import Link from "next/link";
import { getCandidate } from "@/lib/candidate/data";
import { categories, type CandidateCredential } from "@/lib/candidate/schema";
import { CredentialCard, EmptyState } from "@/components/candidate/cards";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("My credentials", "Explore your earned credentials.", "/dashboard/credentials", false);
export default async function CredentialsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { credentials, profile } = await getCandidate();
  const { category } = await searchParams;
  const filter = category && Object.hasOwn(categories, category) ? category : null;
  const visible = credentials.filter((c) => !filter || c.credential_type === filter);
  const grouped = groupByIssuer(visible);
  return <><header><h1 className="text-3xl font-semibold">My credentials</h1><p className="mt-3 text-muted-foreground">A record of your verified learning, work and contributions, grouped by the organization that issued each credential.</p></header><nav aria-label="Credential categories" className="flex flex-wrap gap-2">{[["", "All"], ...Object.entries(categories)].map(([key, label]) => <Link key={key} href={key ? `/dashboard/credentials?category=${key}` : "/dashboard/credentials"} aria-current={(filter || "") === key ? "page" : undefined} className={`rounded-full border px-3 py-2 text-xs ${(filter || "") === key ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{label}</Link>)}</nav>{visible.length ? <div className="space-y-8">{grouped.map(([issuer, items]) => { const id = `issuer-${issuer.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`; return <section key={issuer} className="space-y-4" aria-labelledby={id}><div><h2 id={id} className="text-xl font-semibold">{issuer}</h2><p className="mt-1 text-sm text-muted-foreground">{items.length} credential{items.length===1?"":"s"} issued to this profile.</p></div><div className="grid gap-5 md:grid-cols-2">{items.map((credential) => <CredentialCard key={credential.credential_id} credential={credential} recipient={profile.full_name||"Credential holder"} />)}</div></section>; })}</div> : <EmptyState title={credentials.length ? "No credentials in this category yet." : "No credentials have been issued to this account yet."} description="Issued credentials will appear here automatically. No action is required." />}</>;
}

function groupByIssuer(credentials: CandidateCredential[]) {
  const groups = new Map<string, CandidateCredential[]>();
  for (const credential of credentials) {
    const issuer = credential.issuer || "Unknown issuer";
    groups.set(issuer, [...(groups.get(issuer) ?? []), credential]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
