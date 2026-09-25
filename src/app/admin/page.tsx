import Link from "next/link";
import { DashboardCard } from "@/components/candidate/cards";
import { getAdminOverview } from "@/lib/admin/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Administration", "UZYNTRA Certs internal administration.", "/admin", false);

export default async function AdminPage() {
  const { stats, logs } = await getAdminOverview();
  return <section className="space-y-8">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCard title="Organizations" value={stats.organizations} description="Registered issuer organizations" />
      <DashboardCard title="Members" value={stats.members} description="Organization memberships" />
      <DashboardCard title="Credentials" value={stats.credentials} description="All lifecycle records" />
      <DashboardCard title="Verification activity" value={stats.verificationActivity} description="Recent public lookups" />
      <DashboardCard title="Pending reviews" value={stats.pending} description="Awaiting reviewer approval" />
      <DashboardCard title="Issued credentials" value={stats.issued} description="Currently issued records" />
      <DashboardCard title="Revoked credentials" value={stats.revoked} description="Revoked public records" />
      <DashboardCard title="Operations" value="Live" description="Staff-only controls enabled" />
    </div>
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Recent verification activity</h2>
        <Link href="/admin/audit" className="text-sm text-primary underline">View audit logs</Link>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40"><tr><th className="p-3">Time</th><th className="p-3">Outcome</th></tr></thead>
          <tbody>{logs.map((log) => <tr className="border-t" key={log.id}><td className="p-3">{new Date(log.verified_at).toLocaleString()}</td><td className="p-3">{log.outcome}</td></tr>)}</tbody>
        </table>
        {!logs.length && <p className="p-8 text-center text-muted-foreground">No verification activity yet.</p>}
      </div>
    </section>
  </section>;
}
