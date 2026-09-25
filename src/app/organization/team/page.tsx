import { OrganizationInviteForm } from "@/components/organization/organization-forms";
import { getOrganizationDashboard } from "@/lib/organization/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Organization team", "Invite and review organization issuer staff.", "/organization/team", false);

export default async function OrganizationTeamPage() {
  const { organization, member, members, invites } = await getOrganizationDashboard();
  return <section className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Team management</h1><p className="mt-2 text-sm text-muted-foreground">Invite staff for {organization.name}. Only organization admins can create invites.</p></div>
    {member.role === "ADMIN" && <OrganizationInviteForm />}
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted/40"><tr><th className="p-3">User ID</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th></tr></thead><tbody>{members.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-mono text-xs">{item.user_id}</td><td className="p-3">{item.role}</td><td className="p-3">{item.status}</td><td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Pending invites</h2><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted/40"><tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Expires</th></tr></thead><tbody>{invites.map((invite) => <tr key={invite.id} className="border-t"><td className="p-3">{invite.email}</td><td className="p-3">{invite.role}</td><td className="p-3">{invite.status}</td><td className="p-3">{new Date(invite.expires_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!invites.length && <p className="p-6 text-center text-muted-foreground">No invites yet.</p>}</div></section>
  </section>;
}
