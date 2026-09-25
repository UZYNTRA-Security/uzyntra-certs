import { getCandidate } from "@/lib/candidate/data";
import { earnedBadges } from "@/lib/candidate/schema";
import { BadgeCard, EmptyState } from "@/components/candidate/cards";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("My badges", "Your earned UZYNTRA badges.", "/dashboard/badges", false);
export default async function BadgesPage() {
  const badges = earnedBadges((await getCandidate()).credentials);
  return <><header><h1 className="text-3xl font-semibold">My badges</h1><p className="mt-3 text-muted-foreground">Recognition of your skills and contributions.</p></header>{badges.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{badges.map((badge) => <BadgeCard key={`${badge.credential_id}-${badge.slug}`} badge={badge} />)}</div> : <EmptyState title="Your badge collection starts here." description="Badges earned through issued credentials will appear here with their original UZYNTRA artwork." />}</>;
}
