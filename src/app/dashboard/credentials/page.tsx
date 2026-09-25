import Link from "next/link";
import { getCandidate } from "@/lib/candidate/data";
import { categories } from "@/lib/candidate/schema";
import { CredentialCard, EmptyState } from "@/components/candidate/cards";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("My credentials", "Explore your earned credentials.", "/dashboard/credentials", false);
export default async function CredentialsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { credentials } = await getCandidate();
  const { category } = await searchParams;
  const filter = category && Object.hasOwn(categories, category) ? category : null;
  const visible = credentials.filter((c) => !filter || c.credential_type === filter);
  return <><header><h1 className="text-3xl font-semibold">My credentials</h1><p className="mt-3 text-muted-foreground">A record of your verified learning, work and contributions.</p></header><nav aria-label="Credential categories" className="flex flex-wrap gap-2">{[["", "All"], ...Object.entries(categories)].map(([key, label]) => <Link key={key} href={key ? `/dashboard/credentials?category=${key}` : "/dashboard/credentials"} aria-current={(filter || "") === key ? "page" : undefined} className={`rounded-full border px-3 py-2 text-xs ${(filter || "") === key ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{label}</Link>)}</nav>{visible.length ? <div className="grid gap-5 md:grid-cols-2">{visible.map((credential) => <CredentialCard key={credential.credential_id} credential={credential} />)}</div> : <EmptyState title={credentials.length ? "No credentials in this category yet." : "No credentials have been issued to this account yet."} description="Issued credentials will appear here automatically. No action is required." />}</>;
}
