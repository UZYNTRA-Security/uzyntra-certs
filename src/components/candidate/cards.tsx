import Link from "next/link";
import Image from "next/image";
import { Award, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "./avatar";
import { CopyLink } from "./copy-link";
import { categories, credentialStatus, type CandidateCredential, type EarnedBadge } from "@/lib/candidate/schema";
import { getSiteUrl } from "@/lib/metadata";
export function DashboardCard({ title, value, description }: { title: string; value: string | number; description: string }) {
  return <Card className="border-primary/15"><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold tracking-tight text-primary">{value}</p><p className="mt-2 text-xs text-muted-foreground">{description}</p></CardContent></Card>;
}
export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center"><Award className="mx-auto mb-4 size-9 text-primary/60" aria-hidden /><h2 className="font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p></div>;
}
export function VerificationStatus({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status === "ACTIVE" ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}><ShieldCheck className="size-3.5" aria-hidden />{status === "ACTIVE" ? "Verified" : status.replaceAll("_", " ").toLowerCase()}</span>;
}
export function ProfileCard({ name, username, headline, avatar, visibility }: { name: string; username: string | null; headline: string | null; avatar: string | null; visibility: string }) {
  return <Card><CardContent className="flex flex-wrap items-center gap-5 pt-6"><Avatar name={name} src={avatar} /><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-semibold">{name || "Complete your profile"}</h2><p className="text-sm text-muted-foreground">{username ? `@${username}` : "Choose your public username"}</p><p className="mt-2 text-sm">{headline || "Add a professional headline to tell your story."}</p></div><div className="space-y-2 text-sm"><p className="capitalize text-primary">{visibility} profile</p><Link href="/dashboard/profile" className="inline-flex items-center gap-1 underline underline-offset-4">Edit profile <ArrowUpRight className="size-4" /></Link></div></CardContent></Card>;
}
export function CredentialCard({ credential }: { credential: CandidateCredential }) {
  const url = new URL(`/v/${credential.credential_id}`, getSiteUrl()).toString();
  return <Card className="flex h-full flex-col"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">{categories[credential.credential_type]}</span><VerificationStatus status={credentialStatus(credential)} /></div><CardTitle className="pt-3 text-lg">{credential.title}</CardTitle><p className="text-sm text-muted-foreground">UZYNTRA Security</p></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Issued</dt><dd>{credential.issue_date}</dd></div><div><dt className="text-muted-foreground">Expires</dt><dd>{credential.expiry_date || "No expiry"}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Credential ID</dt><dd className="break-all font-mono text-xs">{credential.credential_id}</dd></div></dl><div className="mt-auto space-y-3">{credential.public_visible ? <><Link href={`/v/${credential.credential_id}`} className="inline-flex items-center gap-1 text-sm text-primary underline">View credential <ArrowUpRight className="size-4" /></Link><CopyLink url={url} /><p className="break-all text-xs text-muted-foreground">{url}</p></> : <p className="text-sm text-muted-foreground">Private credential. Public verification is not enabled by the issuer.</p>}</div></CardContent></Card>;
}
export function BadgeCard({ badge }: { badge: EarnedBadge }) {
  return <Card><CardContent className="space-y-3 pt-6"><Image src={badge.icon_url} alt={badge.name} width={128} height={128} className="mx-auto size-32 object-contain" /><div><p className="text-xs uppercase tracking-wider text-primary">{badge.category}</p><h3 className="mt-1 font-semibold">{badge.name}</h3></div><p className="text-sm text-muted-foreground">{badge.level || "Recognition"} · Earned {badge.earned_date}</p><VerificationStatus status={badge.status} /><p className="text-xs text-muted-foreground">Related credential</p>{badge.public_visible ? <Link className="block text-sm text-primary underline" href={`/v/${badge.credential_id}`}>{badge.credential_title}</Link> : <p className="text-sm">{badge.credential_title}</p>}</CardContent></Card>;
}
