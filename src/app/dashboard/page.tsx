import Link from "next/link";
import { getCandidate } from "@/lib/candidate/data";
import { earnedBadges, profileStrength } from "@/lib/candidate/schema";
import { DashboardCard, ProfileCard, CredentialCard, EmptyState } from "@/components/candidate/cards";
import { pageMetadata } from "@/lib/metadata";
import { getIssuer } from "@/lib/issuer/guards";
export const metadata = pageMetadata("Your dashboard", "Your credentials and professional identity.", "/dashboard", false);
export default async function DashboardPage() {
  const [{ user, profile, credentials }, issuerAccess] = await Promise.all([getCandidate(), getIssuer()]);
  const badges = earnedBadges(credentials);
  return <>
    <header><p className="text-sm text-primary">UZYNTRA Certs / Overview</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome{profile.full_name ? `, ${profile.full_name}` : " to your dashboard"}</h1><p className="mt-3 text-muted-foreground">Your achievements. Your identity. Independently verifiable.</p><p className="mt-3 break-all text-xs text-muted-foreground">{user.email} <span className="ml-2 text-primary">{user.email_confirmed_at ? "Email verified" : "Verification pending"}</span></p>{issuerAccess&&<Link href="/issuer" className="mt-4 inline-block rounded-md border border-primary/30 px-3 py-2 text-sm text-primary">Open issuer console</Link>}</header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardCard title="Credentials earned" value={credentials.length} description="Issued to your account" /><DashboardCard title="Badges earned" value={badges.length} description="Attached to your credentials" /><DashboardCard title="Verification views" value="Coming soon" description="Analytics planned for a future release" /><DashboardCard title="Profile strength" value={`${profileStrength(profile)}%`} description="Complete your professional identity" /></div>
    <ProfileCard name={profile.full_name} username={profile.username} headline={profile.headline} visibility={profile.visibility} avatar={profile.avatar_url ? `/api/avatar?v=${encodeURIComponent(profile.avatar_updated_at || "")}` : null} />
    <section className="space-y-4"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Recent achievements</h2><Link href="/dashboard/credentials" className="text-sm text-primary underline">View all credentials</Link></div>{credentials.length ? <div className="grid gap-4 md:grid-cols-2">{credentials.slice(0, 4).map((credential) => <CredentialCard key={credential.credential_id} credential={credential} />)}</div> : <EmptyState title="No credentials have been issued to this account yet." description="Your credentials and recognitions will appear here when UZYNTRA Security issues them." />}</section>
  </>;
}
