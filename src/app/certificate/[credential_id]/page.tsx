import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Award, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { getCertificateCredential } from "@/lib/certificate/data";
import { credentialIdSchema } from "@/lib/verification/schema";
import { getSiteUrl, pageMetadata } from "@/lib/metadata";
import { ShareActions } from "@/components/verification/share-actions";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ credential_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = credentialIdSchema.safeParse((await params).credential_id);
  if (!parsed.success) return pageMetadata("Certificate", "View a verified UZYNTRA certificate.", "/verify", false);
  const credential = await getCertificateCredential(parsed.data).catch(() => null);
  if (!credential) return pageMetadata("Certificate", "View a verified UZYNTRA certificate.", `/certificate/${parsed.data}`, false);
  return pageMetadata(`${credential.holder} | ${credential.title}`, `Verified ${credential.title} credential issued by ${credential.issuer}.`, `/certificate/${credential.credential_id}`, true);
}

export default async function CertificatePage({ params }: Props) {
  const credential = await getCertificateCredential((await params).credential_id);
  if (!credential) notFound();
  const verificationUrl = new URL(`/v/${credential.credential_id}`, getSiteUrl()).toString();
  const badge = credential.badges[0];
  return <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:py-14">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[.24em] text-primary">UZYNTRA Certs / Certificate</p>
        <h1 className="mt-3 text-3xl font-semibold">Verified certificate preview</h1>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild><a href={`/api/certificate/${credential.credential_id}`}><Download aria-hidden /> Download PDF</a></Button>
        <Button asChild variant="outline"><Link href={`/v/${credential.credential_id}`}><ExternalLink aria-hidden /> Verification</Link></Button>
      </div>
    </div>
    <section className="overflow-hidden rounded-xl border border-primary/25 bg-[#11151c] shadow-2xl shadow-primary/10">
      <div className="grid min-h-[620px] gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4">
              <Image src="/logo/uzyntra-pdf-logo.png" width={120} height={72} alt="" className="h-14 w-auto object-contain" />
              <div><p className="text-sm font-semibold tracking-[.28em] text-primary">UZYNTRA CERTS</p><p className="text-xs text-muted-foreground">Enterprise credential verification</p></div>
            </div>
            <div className="mt-16 space-y-6">
              <p className="text-sm uppercase tracking-[.22em] text-muted-foreground">This certificate is awarded to</p>
              <h2 className="max-w-4xl text-5xl font-semibold leading-tight text-white">{credential.holder}</h2>
              <div className="h-px max-w-3xl bg-primary/40" />
              <p className="max-w-4xl text-3xl font-semibold text-primary">{credential.title}</p>
              {credential.description && <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{credential.description}</p>}
            </div>
          </div>
          <dl className="mt-12 grid gap-5 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Issued by</dt><dd className="mt-1 font-semibold">{credential.issuer}</dd></div>
            <div><dt className="text-muted-foreground">Issue date</dt><dd className="mt-1 font-semibold">{credential.issue_date}</dd></div>
            <div><dt className="text-muted-foreground">Expiry</dt><dd className="mt-1 font-semibold">{credential.expiry_date || "No expiry"}</dd></div>
          </dl>
        </div>
        <aside className="flex flex-col justify-between rounded-lg border border-primary/20 bg-black/20 p-5">
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-primary"><ShieldCheck aria-hidden /><span className="text-sm font-semibold">Verified issued record</span></div>
            {badge ? <div className="rounded-lg border border-primary/20 bg-background/30 p-4 text-center"><Image src={badge.icon_url} width={132} height={132} alt="" className="mx-auto size-32 object-contain" /><p className="mt-3 font-semibold">{badge.name}</p><p className="text-xs text-muted-foreground">{badge.level || badge.category}</p></div> : <div className="rounded-lg border border-primary/20 p-6 text-center"><Award className="mx-auto text-primary" /><p className="mt-3 text-sm">UZYNTRA recognition</p></div>}
            <Image src={`/api/qr/${credential.credential_id}`} width={220} height={220} alt="Certificate verification QR code" className="mx-auto rounded-md bg-white p-3" unoptimized />
          </div>
          <div className="space-y-3">
            <p className="break-all font-mono text-[11px] text-muted-foreground">{verificationUrl}</p>
            <dl className="space-y-2 text-xs"><div><dt className="text-muted-foreground">Credential ID</dt><dd className="break-all font-mono">{credential.credential_id}</dd></div><div><dt className="text-muted-foreground">Certificate slug</dt><dd className="break-all">{credential.certificate_slug}</dd></div></dl>
          </div>
        </aside>
      </div>
    </section>
    <ShareActions credentialId={credential.credential_id} title={credential.title} recipient={credential.holder} />
  </div>;
}
