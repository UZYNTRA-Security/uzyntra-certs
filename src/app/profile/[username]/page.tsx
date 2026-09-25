import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/candidate/data";
import { earnedBadges } from "@/lib/candidate/schema";
import { Avatar } from "@/components/candidate/avatar";
import { BadgeCard, CredentialCard, EmptyState } from "@/components/candidate/cards";
import { pageMetadata } from "@/lib/metadata";
type Props = { params: Promise<{ username: string }> };
export async function generateMetadata({ params }: Props) {
  const profile = await getPublicProfile((await params).username);
  if (!profile) return { title: "Profile unavailable", robots: { index: false, follow: false } };
  return pageMetadata(`${profile.full_name} | Verified Credentials`, `Explore ${profile.full_name}'s published credentials and recognitions on UZYNTRA Certs.`, `/profile/${profile.username}`);
}
export default async function PublicProfilePage({ params }: Props) {
  const profile = await getPublicProfile((await params).username);
  if (!profile) notFound();
  const badges = earnedBadges(profile.credentials);
  const socials = [["LinkedIn", profile.linkedin_url], ["GitHub", profile.github_url], ["Portfolio", profile.portfolio_url]].filter(([, url]) => { try { return url && new URL(url).protocol === "https:"; } catch { return false; } });
  return <div className="mx-auto max-w-6xl space-y-12 px-6 py-16"><header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-6 sm:p-10"><p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">UZYNTRA professional profile</p><div className="flex flex-wrap items-center gap-6"><Avatar name={profile.full_name} src={profile.has_avatar ? `/api/avatar?username=${profile.username}&v=${encodeURIComponent(profile.avatar_updated_at || "")}` : null} /><div className="min-w-0"><h1 className="break-words text-3xl font-semibold">{profile.full_name}</h1><p className="mt-1 text-sm text-muted-foreground">@{profile.username}{profile.country ? ` / ${profile.country}` : ""}</p>{profile.headline && <p className="mt-3 text-lg">{profile.headline}</p>}</div></div>{profile.bio && <p className="mt-6 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{profile.bio}</p>}<div className="mt-5 flex flex-wrap gap-5">{socials.map(([label, url]) => <a key={label} href={url!} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-sm text-primary underline">{label}</a>)}</div><p className="mt-6 text-xs text-muted-foreground">Profile details are provided by the candidate. Credential verification reflects the issuer&apos;s records.</p></header><section className="space-y-5"><h2 className="text-2xl font-semibold">Verified credentials</h2>{profile.credentials.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{profile.credentials.map((credential) => <CredentialCard key={credential.credential_id} credential={credential} />)}</div> : <EmptyState title="No public credentials yet." description="Published credentials will appear here when available." />}</section><section className="space-y-5"><h2 className="text-2xl font-semibold">Earned badges</h2>{badges.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{badges.map((badge) => <BadgeCard key={`${badge.credential_id}-${badge.slug}`} badge={badge} />)}</div> : <EmptyState title="No public badges yet." description="Badges attached to published credentials will appear here." />}</section></div>;
}
