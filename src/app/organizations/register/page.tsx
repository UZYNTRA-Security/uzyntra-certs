import { OrganizationApplicationForm } from "@/components/organization/organization-forms";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Register organization", "Apply to become a verified UZYNTRA Certs issuing organization.", "/organizations/register", false);

export default function OrganizationRegisterPage() {
  return <div className="mx-auto max-w-4xl space-y-8 px-6 py-16">
    <header className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Organization onboarding</p><h1 className="text-4xl font-semibold">Apply for issuer access</h1><p className="max-w-2xl text-muted-foreground">Submit your institution or company for UZYNTRA review. Approved organizations can invite staff and issue credentials under their own organization boundary.</p></header>
    <OrganizationApplicationForm />
  </div>;
}
