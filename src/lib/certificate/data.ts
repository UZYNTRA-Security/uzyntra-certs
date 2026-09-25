import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { credentialIdSchema } from "@/lib/verification/schema";

export async function getCertificateCredential(input: string, access: "public" | "owner" = "public") {
  const parsed = credentialIdSchema.safeParse(input);
  if (!parsed.success) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("credentials").select("*,profiles!credentials_owner_id_fkey(full_name,username,avatar_url,avatar_updated_at),credential_badges(badges(name,slug,icon_url,category,level,active))").eq("credential_id", parsed.data).maybeSingle();
  if (error || !data) throw new Error("Certificate record could not be loaded.");
  if (data.status !== "ISSUED" || !data.public_visible) {
    if (access !== "owner") return null;
    const { data: auth } = await (await createClient()).auth.getUser();
    if (!auth.user || auth.user.id !== data.owner_id || data.status !== "ISSUED") return null;
  }
  const organization = await admin.from("organizations").select("name,slug,logo_url").eq("id", data.organization_id).maybeSingle();
  if (organization.error) throw new Error("Certificate issuer could not be loaded.");
  return {
    ...data,
    issuer: organization.data?.name ?? "UZYNTRA Security",
    holder: data.public_holder_name || data.profiles?.full_name || "Credential holder",
    badges: data.credential_badges.flatMap((link) => link.badges?.active ? [link.badges] : []),
  };
}
