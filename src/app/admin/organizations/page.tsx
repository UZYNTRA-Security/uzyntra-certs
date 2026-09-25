import { OrganizationStatusForm } from "@/components/admin/admin-forms";
import { getAdminOrganizations } from "@/lib/admin/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Organizations", "Manage credential issuer organizations.", "/admin/organizations", false);

export default async function AdminOrganizationsPage() {
  const organizations = await getAdminOrganizations();
  return <section className="space-y-5">
    <h2 className="text-2xl font-semibold">Organizations</h2>
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40"><tr><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Members</th><th className="p-3">Credentials</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{organizations.map((organization) => <tr className="border-t" key={organization.id}>
          <td className="p-3"><p className="font-medium">{organization.name}</p><p className="text-xs text-muted-foreground">{organization.slug}</p></td>
          <td className="p-3">{organization.organization_type}</td>
          <td className="p-3">{organization.verified_status}</td>
          <td className="p-3">{organization.member_count}</td>
          <td className="p-3">{organization.credential_count}</td>
          <td className="p-3"><OrganizationStatusForm organizationId={organization.id} status={organization.verified_status} /></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
