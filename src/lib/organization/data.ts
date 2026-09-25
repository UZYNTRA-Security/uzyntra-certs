import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireIssuerPage } from "@/lib/issuer/guards";
import { requirePlatformAdmin } from "@/lib/admin/data";

export const getPublicOrganization = cache(async (slug: string) => {
  const admin = createAdminClient();
  const organization = await admin.from("organizations").select("*").eq("slug", slug).maybeSingle();
  if (organization.error) throw new Error("Organization could not be loaded.");
  if (!organization.data) return null;
  const org = organization.data;
  const [credentials, logs, settings] = await Promise.all([
    admin.from("credentials").select("id,status").eq("organization_id", org.id),
    admin.from("verification_logs").select("id,credential_id,credentials!verification_logs_credential_id_fkey(organization_id)").limit(1000),
    admin.from("organization_settings").select("*").eq("organization_id", org.id).maybeSingle(),
  ]);
  if (credentials.error || logs.error) throw new Error("Organization statistics could not be loaded.");
  return {
    organization: org,
    settings: settings.data,
    credentialCount: credentials.data.length,
    issuedCount: credentials.data.filter((credential) => credential.status === "ISSUED").length,
    verificationViews: (logs.data ?? []).filter((log) => log.credentials?.organization_id === org.id).length,
  };
});

export async function getOrganizationDashboard() {
  const access = await requireIssuerPage();
  const admin = createAdminClient();
  const [credentials, members, badges, logs, settings, invites] = await Promise.all([
    admin.from("credentials").select("id,title,status,credential_id,created_at").eq("organization_id", access.organization.id).order("created_at", { ascending: false }),
    admin.from("organization_members").select("id,user_id,role,status,created_at").eq("organization_id", access.organization.id),
    admin.from("badges").select("id,active"),
    admin.from("verification_logs").select("id,credential_id,credentials!verification_logs_credential_id_fkey(organization_id)").limit(1000),
    admin.from("organization_settings").select("*").eq("organization_id", access.organization.id).maybeSingle(),
    admin.from("organization_invites").select("*").eq("organization_id", access.organization.id).order("created_at", { ascending: false }),
  ]);
  if (credentials.error || members.error || badges.error || logs.error || invites.error) throw new Error("Organization dashboard could not be loaded.");
  const verificationViews = (logs.data ?? []).filter((log) => log.credentials?.organization_id === access.organization.id).length;
  return {
    ...access,
    credentials: credentials.data,
    members: members.data,
    invites: invites.data,
    settings: settings.data,
    stats: {
      credentials: credentials.data.length,
      issued: credentials.data.filter((credential) => credential.status === "ISSUED").length,
      pending: credentials.data.filter((credential) => credential.status === "PENDING_REVIEW").length,
      verificationViews,
      members: members.data.length,
      activeBadges: badges.data.filter((badge) => badge.active).length,
    },
  };
}

export async function getAdminOrganizationApplications() {
  await requirePlatformAdmin();
  const result = await createAdminClient().from("organization_applications").select("*").order("created_at", { ascending: false });
  if (result.error) throw new Error("Organization applications could not be loaded.");
  return result.data;
}

export async function requirePublicOrganization(slug: string) {
  const value = await getPublicOrganization(slug);
  if (!value) notFound();
  return value;
}
