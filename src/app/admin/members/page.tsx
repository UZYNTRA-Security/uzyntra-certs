import { MemberForm, PasswordResetLinkForm, RemoveMemberForm } from "@/components/admin/admin-forms";
import { getAdminMembers } from "@/lib/admin/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Members", "Manage issuer organization members.", "/admin/members", false);

export default async function AdminMembersPage() {
  const { members, organizations, profiles } = await getAdminMembers();
  const orgMap = new Map(organizations.map((organization) => [organization.id, organization]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold">Issuer members</h2>
      <p className="mt-2 text-sm text-muted-foreground">Add members by profile UUID, change roles, suspend access or remove membership.</p>
    </div>
    <section className="space-y-3"><h3 className="text-lg font-semibold">Super-admin password reset</h3><p className="text-sm text-muted-foreground">Generate a Supabase recovery link for an internal account. Send it through an approved staff channel.</p><PasswordResetLinkForm /></section>
    <MemberForm organizations={organizations} />
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40"><tr><th className="p-3">Member</th><th className="p-3">Organization</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
        <tbody>{members.map((member) => {
          const profile = profileMap.get(member.user_id);
          return <tr className="border-t" key={member.id}>
            <td className="p-3"><p className="font-medium">{profile?.full_name || profile?.username || "Profile"}</p><p className="font-mono text-xs text-muted-foreground">{member.user_id}</p></td>
            <td className="p-3">{orgMap.get(member.organization_id)?.name ?? "Organization"}</td>
            <td className="p-3">{member.role}</td>
            <td className="p-3">{member.status}</td>
            <td className="p-3"><RemoveMemberForm memberId={member.id} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
