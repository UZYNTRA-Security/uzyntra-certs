import { OrganizationSettingsForm } from "@/components/organization/organization-forms";
import { getOrganizationDashboard } from "@/lib/organization/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Organization settings", "Manage issuer branding settings.", "/organization/settings", false);

export default async function OrganizationSettingsPage() {
  const { organization, member, settings } = await getOrganizationDashboard();
  return <section className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Organization branding</h1><p className="mt-2 text-sm text-muted-foreground">Configure issuer display details. UZYNTRA trust marks and verification authority remain protected.</p></div>
    {member.role === "ADMIN" ? <OrganizationSettingsForm settings={settings} organizationName={organization.name} /> : <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Only organization admins can update settings.</p>}
  </section>;
}
