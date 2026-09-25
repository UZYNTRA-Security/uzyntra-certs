import "server-only";
import { cache } from "react";
import { requirePageUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { candidateCredentialSchema, publicProfileSchema, usernameSchema } from "./schema";

export const getCandidate = cache(async () => {
  const user = await requirePageUser();
  const client = await createClient();
  const [profile, credentials] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).single(),
    client.from("credentials").select("credential_id,certificate_slug,title,credential_type,issue_date,expiry_date,status,public_visible,organization_id,credential_badges(badges(name,slug,icon_url,category,level,active))").eq("owner_id", user.id).order("issue_date", { ascending: false }),
  ]);
  if (profile.error || credentials.error) throw new Error("Your candidate account could not be loaded. Please try again.");
  const organizationIds = [...new Set(credentials.data.map((credential) => credential.organization_id))];
  const organizations = organizationIds.length ? await createAdminClient().from("organizations").select("id,name").in("id", organizationIds) : { data: [], error: null };
  if (organizations.error) throw new Error("Your credential issuers could not be loaded.");
  const orgMap = new Map((organizations.data ?? []).map((organization) => [organization.id, organization.name]));
  return { user, profile: profile.data, credentials: credentials.data.map((c) => candidateCredentialSchema.parse({ ...c, issuer: orgMap.get(c.organization_id), badges: c.credential_badges.flatMap((link) => link.badges?.active ? [link.badges] : []) })) };
});

export const getPublicProfile = cache(async (username: string) => {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return null;
  const { data, error } = await createAdminClient().rpc("get_public_profile", { requested_username: parsed.data });
  if (error) throw new Error("Public profiles are temporarily unavailable.");
  return data ? publicProfileSchema.parse(data) : null;
});
