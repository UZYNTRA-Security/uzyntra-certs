import { getAdminAuditLogs } from "@/lib/admin/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Audit logs", "Credential lifecycle audit events.", "/admin/audit", false);

export default async function AdminAuditPage() {
  const { events, actors, credentials, organizations } = await getAdminAuditLogs();
  const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
  const credentialMap = new Map(credentials.map((credential) => [credential.id, credential]));
  const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
  return <section className="space-y-5">
    <div>
      <h2 className="text-2xl font-semibold">Audit logs</h2>
      <p className="mt-2 text-sm text-muted-foreground">Credential lifecycle events are append-only and cannot be edited or deleted.</p>
    </div>
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40"><tr><th className="p-3">Timestamp</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Credential</th><th className="p-3">Organization</th></tr></thead>
        <tbody>{events.map((event) => {
          const actor = event.actor_user_id ? actorMap.get(event.actor_user_id) : null;
          const credential = credentialMap.get(event.credential_id);
          return <tr className="border-t" key={event.id}>
            <td className="p-3">{new Date(event.created_at).toLocaleString()}</td>
            <td className="p-3"><p>{actor?.full_name || actor?.username || "System"}</p>{event.actor_user_id && <p className="font-mono text-xs text-muted-foreground">{event.actor_user_id}</p>}</td>
            <td className="p-3">{event.event_type}</td>
            <td className="p-3"><p>{credential?.title || "Credential"}</p><p className="font-mono text-xs text-muted-foreground">{credential?.credential_id}</p></td>
            <td className="p-3">{credential ? organizationMap.get(credential.organization_id)?.name : "Organization"}</td>
          </tr>;
        })}</tbody>
      </table>
      {!events.length && <p className="p-8 text-center text-muted-foreground">No audit events yet.</p>}
    </div>
  </section>;
}
