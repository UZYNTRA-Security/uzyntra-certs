import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { verifyCredential } from "@/lib/verification/service";
import { credentialIdSchema } from "@/lib/verification/schema";
import { getSiteUrl, pageMetadata } from "@/lib/metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type Props = { params: Promise<{ credential_id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = credentialIdSchema.safeParse((await params).credential_id);
  return pageMetadata("Credential verification", "Review the current status and approved public details of a UZYNTRA Security credential.", parsed.success ? `/v/${parsed.data}` : "/verify", false);
}
export default async function CredentialPage({ params }: Props) {
  const result = await verifyCredential((await params).credential_id);
  if (result.outcome === "not_found") notFound();
  if (result.outcome !== "found") return <div className="mx-auto max-w-2xl space-y-6 px-6 py-20"><h1 className="text-3xl font-semibold">{result.outcome === "rate_limited" ? "Please wait before checking again" : "Verification temporarily unavailable"}</h1><p role="status">{result.outcome === "rate_limited" ? "Too many verification requests. Try again in one minute." : "We could not check this credential right now. Please try again later."}</p><Link href="/verify" className="text-primary underline">Return to verification</Link></div>;
  const credential = result.credential;
  const active = credential.status === "ACTIVE";
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structured = { "@context": "https://schema.org", "@type": "CreativeWork", name: credential.title, identifier: credential.credential_id, creator: { "@type": "Organization", name: credential.issuer }, dateCreated: credential.issue_date, about: { "@type": "Person", name: credential.holder_name }, url: new URL(`/v/${credential.credential_id}`, getSiteUrl()).href, description: `Credential status: ${credential.status}. Checked against UZYNTRA records.` };
  return <div className="mx-auto max-w-3xl space-y-8 px-6 py-16">
    <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    <div><p className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">UZYNTRA Security / Public verification</p><h1 className="text-3xl font-semibold">{active ? "Verified credential" : "Credential status"}</h1><p className={`mt-4 inline-block rounded-full border px-4 py-2 text-sm font-semibold ${active ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"}`}>{active ? "✓ Verified · ACTIVE" : credential.status.replaceAll("_", " ")}</p>{!active && <p className="mt-4 text-sm">This record exists, but the credential is not currently valid.</p>}</div>
    <Card><CardHeader><CardTitle className="text-2xl leading-tight">{credential.title}</CardTitle></CardHeader><CardContent><dl className="grid gap-6 sm:grid-cols-2">
      {[["Holder", credential.holder_name], ["Issuer", credential.issuer], ["Credential ID", credential.credential_id], ["Type", credential.credential_type.replaceAll("_", " ")], ["Issue date", credential.issue_date], ["Expiry date", credential.expiry_date ?? "No expiry date"]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm font-medium">{value}</dd></div>)}
    </dl></CardContent></Card>
    {credential.badges.length > 0 && <section aria-labelledby="badges-heading"><h2 id="badges-heading" className="mb-4 text-xl font-semibold">Associated badges</h2><div className="grid gap-4 sm:grid-cols-2">{credential.badges.map((badge) => <div key={badge.slug} className="flex items-center gap-4 rounded-xl border p-4"><Image src={badge.icon_url} width={80} height={80} alt="" className="size-20 object-contain" /><div><h3 className="font-medium">{badge.name}</h3><p className="text-sm text-muted-foreground">{badge.level ?? badge.category}</p></div></div>)}</div></section>}
    <p className="text-sm text-muted-foreground">Status checked against UZYNTRA records for this visit. The issuer can update or revoke a credential; revisit this link for its current status.</p>
    <Link href="/verify" className="text-primary underline">Verify another credential</Link>
  </div>;
}
