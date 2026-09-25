import Link from "next/link";
import Image from "next/image";
import { requirePublicOrganization } from "@/lib/organization/data";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { organization } = await requirePublicOrganization((await params).slug);
  return pageMetadata(`${organization.name} | UZYNTRA Certs`, `View ${organization.name}'s verified issuer profile on UZYNTRA Certs.`, `/organizations/${organization.slug}`);
}

export default async function PublicOrganizationPage({ params }: Props) {
  const { organization, settings, credentialCount, issuedCount, verificationViews } = await requirePublicOrganization((await params).slug);
  const logo = settings?.logo_url || organization.logo_url;
  return <div className="mx-auto max-w-5xl space-y-8 px-6 py-16">
    <header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-8">
      <div className="flex flex-wrap items-center gap-6">{logo ? <Image src={logo} width={88} height={88} alt="" className="size-22 object-contain" /> : <div className="grid size-22 place-items-center rounded-xl border border-primary/30 text-3xl font-semibold text-primary">{organization.name[0]}</div>}<div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Verified issuer profile</p><h1 className="mt-2 text-4xl font-semibold">{organization.name}</h1><p className="mt-2 text-sm text-muted-foreground">{organization.verified_status === "VERIFIED" ? "Verified Organization ✓" : organization.verified_status.replaceAll("_", " ")}</p></div></div>
      {organization.description && <p className="mt-6 max-w-3xl leading-7 text-muted-foreground">{organization.description}</p>}
      <div className="mt-5 flex flex-wrap gap-4 text-sm">{organization.website && <a href={organization.website} className="text-primary underline" target="_blank" rel="noopener noreferrer nofollow">Website</a>}<span>{organization.organization_type.replaceAll("_", " ")}</span>{organization.country && <span>{organization.country}</span>}</div>
    </header>
    <section className="grid gap-4 sm:grid-cols-3">
      <Stat label="Credentials issued" value={issuedCount} />
      <Stat label="All credential records" value={credentialCount} />
      <Stat label="Verification views" value={verificationViews} />
    </section>
    <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Credentials may be issued by {settings?.issuer_display_name || organization.name}, but UZYNTRA Certs remains the verification authority for public credential URLs and trust records.</p>
    <Link href="/verify" className="text-primary underline">Verify a credential</Link>
  </div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-card p-5"><p className="text-3xl font-semibold text-primary">{value.toLocaleString()}</p><p className="mt-2 text-sm text-muted-foreground">{label}</p></div>;
}
