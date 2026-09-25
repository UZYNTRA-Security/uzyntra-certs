import Link from "next/link";
import { DashboardCard } from "@/components/candidate/cards";
import { getOrganizationDashboard } from "@/lib/organization/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Organization dashboard", "Manage your issuer organization.", "/organization/dashboard", false);

export default async function OrganizationDashboardPage() {
  const { organization, member, stats, credentials } = await getOrganizationDashboard();
  const topCredentials = credentials.filter((credential) => credential.status === "ISSUED").slice(0, 5);
  return <section className="space-y-7">
    <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Organization portal</p><h1 className="text-3xl font-semibold">{organization.name}</h1><p className="text-sm text-muted-foreground">Status: {organization.verified_status.replaceAll("_", " ")} · Your role: {member.role}</p></header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCard title="Credentials issued" value={stats.issued} description="Published records" />
      <DashboardCard title="Pending review" value={stats.pending} description="Awaiting reviewer action" />
      <DashboardCard title="Verification views" value={stats.verificationViews} description="Recent public lookups" />
      <DashboardCard title="Members" value={stats.members} description="Active and invited staff" />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Top credentials</h2><Link href="/issuer" className="text-sm text-primary underline">Issuer console</Link></div>{topCredentials.length ? <ul className="space-y-3">{topCredentials.map((credential) => <li key={credential.id} className="rounded-lg border bg-background/40 p-3"><p className="font-medium">{credential.title}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{credential.credential_id}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No issued credentials yet.</p>}</section>
      <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Organization actions</h2><div className="mt-4 grid gap-3 text-sm"><Link href="/organization/team" className="rounded-lg border p-3 text-primary underline">Manage team invites</Link><Link href="/organization/settings" className="rounded-lg border p-3 text-primary underline">Branding settings</Link><Link href={`/organizations/${organization.slug}`} className="rounded-lg border p-3 text-primary underline">Public organization profile</Link></div></section>
    </div>
  </section>;
}
