import Image from "next/image";
import { BadgeMetadataForm } from "@/components/admin/admin-forms";
import { BadgeUpload } from "@/components/issuer/badge-upload";
import { getAdminBadges } from "@/lib/admin/data";
import { requirePlatformAdmin } from "@/lib/admin/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Badge management", "Manage UZYNTRA credential badges.", "/admin/badges", false);

export default async function AdminBadgesPage() {
  const [{ user }, badges] = await Promise.all([requirePlatformAdmin(), getAdminBadges()]);
  return <section className="space-y-8">
    <div>
      <h2 className="text-2xl font-semibold">Badge management</h2>
      <p className="mt-2 text-sm text-muted-foreground">Upload badge artwork, update metadata and control catalog activation.</p>
    </div>
    <BadgeUpload userId={user.id} />
    <div className="grid gap-5 lg:grid-cols-2">
      {badges.map((badge) => <article key={badge.id} className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[120px_minmax(0,1fr)]">
        <Image src={badge.icon_url} width={112} height={112} alt="" className="size-28 object-contain" />
        <div className="space-y-3">
          <div><p className="text-xs uppercase tracking-wider text-primary">{badge.active ? "Active" : "Inactive"} · {badge.slug}</p><h3 className="font-semibold">{badge.name}</h3></div>
          <BadgeMetadataForm badge={badge} />
        </div>
      </article>)}
    </div>
  </section>;
}
