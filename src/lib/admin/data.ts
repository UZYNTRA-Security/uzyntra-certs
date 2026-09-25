import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireIssuer } from "@/lib/issuer/guards";
import type { CredentialStatus, Database } from "@/types/database";

type CredentialEvent = Database["public"]["Tables"]["credential_events"]["Row"];

export async function requirePlatformAdmin() {
  const access = await requireIssuer(["ADMIN"]);
  if (access.organization.slug !== "uzyntra-security") throw new Error("Platform admin access is required.");
  return access;
}

export async function getAdminOverview() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const [organizations, members, credentials, logs] = await Promise.all([
    admin.from("organizations").select("id,name,slug,organization_type,verified_status,created_at"),
    admin.from("organization_members").select("id,organization_id,user_id,role,status,created_at"),
    admin.from("credentials").select("id,status,organization_id,created_at"),
    admin.from("verification_logs").select("id,outcome,verified_at").order("verified_at", { ascending: false }).limit(50),
  ]);
  if (organizations.error || members.error || credentials.error || logs.error) throw new Error("Admin records could not be loaded.");
  const byStatus = (status: CredentialStatus) => credentials.data.filter((credential) => credential.status === status).length;
  return {
    organizations: organizations.data,
    members: members.data,
    credentials: credentials.data,
    logs: logs.data,
    stats: {
      organizations: organizations.data.length,
      members: members.data.length,
      credentials: credentials.data.length,
      pending: byStatus("PENDING_REVIEW"),
      issued: byStatus("ISSUED"),
      revoked: byStatus("REVOKED"),
      verificationActivity: logs.data.length,
    },
  };
}

export async function getAdminOrganizations() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const [organizations, members, credentials] = await Promise.all([
    admin.from("organizations").select("*").order("created_at", { ascending: false }),
    admin.from("organization_members").select("organization_id"),
    admin.from("credentials").select("organization_id"),
  ]);
  if (organizations.error || members.error || credentials.error) throw new Error("Organizations could not be loaded.");
  return organizations.data.map((organization) => ({
    ...organization,
    member_count: members.data.filter((member) => member.organization_id === organization.id).length,
    credential_count: credentials.data.filter((credential) => credential.organization_id === organization.id).length,
  }));
}

export async function getAdminMembers() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const [members, organizations] = await Promise.all([
    admin.from("organization_members").select("*").order("created_at", { ascending: false }),
    admin.from("organizations").select("id,name,slug").order("name"),
  ]);
  if (members.error || organizations.error) throw new Error("Members could not be loaded.");
  const ids = members.data.map((member) => member.user_id);
  const profiles = ids.length ? await admin.from("profiles").select("id,full_name,username").in("id", ids) : { data: [], error: null };
  if (profiles.error) throw new Error("Member profiles could not be loaded.");
  return { members: members.data, organizations: organizations.data, profiles: profiles.data ?? [] };
}

export async function getAdminCredentials(status?: string, query?: string) {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  let request = admin.from("credentials").select("*,profiles!credentials_owner_id_fkey(full_name,username)").order("created_at", { ascending: false });
  if (isCredentialStatus(status)) request = request.eq("status", status);
  const result = await request;
  if (result.error) throw new Error("Credentials could not be loaded.");
  const organizationIds = [...new Set(result.data.map((credential) => credential.organization_id))];
  const credentialIds = result.data.map((credential) => credential.id);
  const [organizations, events] = await Promise.all([
    organizationIds.length ? admin.from("organizations").select("id,name,slug").in("id", organizationIds) : { data: [], error: null },
    credentialIds.length ? admin.from("credential_events").select("*").in("credential_id", credentialIds).order("created_at", { ascending: false }) : { data: [], error: null },
  ]);
  if (organizations.error || events.error) throw new Error("Credential details could not be loaded.");
  const orgMap = new Map((organizations.data ?? []).map((organization) => [organization.id, organization]));
  const eventMap = new Map<string, CredentialEvent[]>();
  for (const event of events.data ?? []) eventMap.set(event.credential_id, [...(eventMap.get(event.credential_id) ?? []), event]);
  const hydrated = result.data.map((credential) => ({ ...credential, organization: orgMap.get(credential.organization_id), events: eventMap.get(credential.id) ?? [] }));
  const normalized = (query ?? "").trim().toLowerCase();
  return normalized
    ? hydrated.filter((credential) =>
        credential.credential_id.toLowerCase().includes(normalized) ||
        credential.title.toLowerCase().includes(normalized) ||
        credential.profiles?.full_name?.toLowerCase().includes(normalized) ||
        credential.profiles?.username?.toLowerCase().includes(normalized))
    : hydrated;
}

export async function getAdminBadges() {
  await requirePlatformAdmin();
  const result = await createAdminClient().from("badges").select("*").order("name");
  if (result.error) throw new Error("Badges could not be loaded.");
  return result.data;
}

export async function getAdminAuditLogs() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const events = await admin.from("credential_events").select("*").order("created_at", { ascending: false }).limit(200);
  if (events.error) throw new Error("Audit events could not be loaded.");
  const actorIds = events.data.flatMap((event) => event.actor_user_id ? [event.actor_user_id] : []);
  const credentialIds = events.data.map((event) => event.credential_id);
  const [actors, credentials] = await Promise.all([
    actorIds.length ? admin.from("profiles").select("id,full_name,username").in("id", actorIds) : { data: [], error: null },
    credentialIds.length ? admin.from("credentials").select("id,credential_id,title,organization_id").in("id", credentialIds) : { data: [], error: null },
  ]);
  if (actors.error || credentials.error) throw new Error("Audit details could not be loaded.");
  const organizationIds = [...new Set((credentials.data ?? []).map((credential) => credential.organization_id))];
  const organizations = organizationIds.length ? await admin.from("organizations").select("id,name").in("id", organizationIds) : { data: [], error: null };
  if (organizations.error) throw new Error("Audit organizations could not be loaded.");
  return { events: events.data, actors: actors.data ?? [], credentials: credentials.data ?? [], organizations: organizations.data ?? [] };
}

function isCredentialStatus(status: string | undefined): status is CredentialStatus {
  return status === "DRAFT" || status === "PENDING_REVIEW" || status === "ISSUED" || status === "EXPIRED" || status === "REVOKED";
}
