import { OrganizationCreateForm, OrganizationStatusForm } from "@/components/admin/admin-forms";
import { getAdminOrganizations } from "@/lib/admin/data";
import { ApplicationReviewForm } from "@/components/organization/organization-forms";
import { getAdminOrganizationApplications } from "@/lib/organization/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Organizations", "Manage credential issuer organizations.", "/admin/organizations", false);

export default async function AdminOrganizationsPage() {
  const [organizations, applications] = await Promise.all([getAdminOrganizations(), getAdminOrganizationApplications()]);
  return <section className="space-y-6">
    <div><h2 className="text-2xl font-semibold">Organizations</h2><p className="mt-2 text-sm text-muted-foreground">Create internal issuer organizations, verify trusted accounts and suspend compromised organizations.</p></div>
    <section className="space-y-3"><h3 className="text-xl font-semibold">Applications</h3><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted/40"><tr><th className="p-3">Organization</th><th className="p-3">Type</th><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{applications.map((application) => <tr className="border-t" key={application.id}><td className="p-3"><p className="font-medium">{application.organization_name}</p><p className="text-xs text-muted-foreground">{application.organization_slug}</p></td><td className="p-3">{application.organization_type}</td><td className="p-3">{application.official_email}</td><td className="p-3">{application.status}</td><td className="p-3"><ApplicationReviewForm applicationId={application.id} status={application.status} /></td></tr>)}</tbody></table>{!applications.length && <p className="p-6 text-center text-muted-foreground">No organization applications yet.</p>}</div></section>
    <OrganizationCreateForm />
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
