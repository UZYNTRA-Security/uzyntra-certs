import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireIssuerPage } from "./guards";
export async function getIssuerDashboard() {
  const { issuer, organization, member, memberships } = await requireIssuerPage();
  const admin = createAdminClient();
  const [credentials, badges] = await Promise.all([
    admin.from("credentials").select("*,profiles!credentials_owner_id_fkey(full_name,username),credential_badges(badge_id,badges(name,slug,icon_url,category,level)),credential_events(*)").eq("organization_id",organization.id).order("created_at",{ascending:false}),
    admin.from("badges").select("*").order("name"),
  ]);
  if (credentials.error || badges.error) throw new Error("Issuer records could not be loaded.");
  return { issuer, organization, member, memberships, credentials: credentials.data, badges: badges.data };
}
