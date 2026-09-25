"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "./data";

type AdminState = { status: "idle" | "success" | "error"; message?: string };
const ok = (message: string): AdminState => ({ status: "success", message });
const fail = (message = "Admin action could not be completed."): AdminState => ({ status: "error", message });
const refreshAdmin = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/issuer", "layout");
  revalidatePath("/dashboard", "layout");
};

const organizationStatusSchema = z.object({
  organization_id: z.uuid(),
  status: z.enum(["PENDING", "VERIFIED", "SUSPENDED"]),
});
const memberSchema = z.object({
  organization_id: z.uuid(),
  user_id: z.uuid(),
  role: z.enum(["ADMIN", "REVIEWER", "ISSUER", "VIEWER"]),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).default("ACTIVE"),
});
const memberRemoveSchema = z.object({ member_id: z.uuid() });
const credentialActionSchema = z.object({ credential_id: z.uuid(), action: z.enum(["issue", "revoke"]), reason: z.string().trim().optional() });
const badgeSchema = z.object({
  badge_id: z.uuid(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).transform((value) => value || null),
  category: z.enum(["COURSE", "SECURITY", "CONTRIBUTION", "INTERNSHIP", "RECOGNITION"]),
  level: z.string().trim().max(80).transform((value) => value || null),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function updateOrganizationStatusAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    const { user } = await requirePlatformAdmin();
    const parsed = organizationStatusSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().rpc("admin_update_organization_status", { actor_user: user.id, target_organization: parsed.organization_id, new_status: parsed.status });
    if (result.error) return fail("Organization status was not changed.");
    refreshAdmin();
    return ok(`Organization marked ${parsed.status.toLowerCase()}.`);
  } catch { return fail(); }
}

export async function upsertMemberAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    const { user } = await requirePlatformAdmin();
    const parsed = memberSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().rpc("admin_upsert_organization_member", { actor_user: user.id, target_organization: parsed.organization_id, target_user: parsed.user_id, new_role: parsed.role, new_status: parsed.status });
    if (result.error) return fail("Member role was not changed.");
    refreshAdmin();
    return ok("Member permissions updated.");
  } catch { return fail("Enter a valid profile UUID and role."); }
}

export async function removeMemberAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    const { user } = await requirePlatformAdmin();
    const parsed = memberRemoveSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().rpc("admin_remove_organization_member", { actor_user: user.id, target_membership: parsed.member_id });
    if (result.error) return fail("Member was not removed.");
    refreshAdmin();
    return ok("Member removed from the organization.");
  } catch { return fail(); }
}

export async function adminCredentialAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    const { user } = await requirePlatformAdmin();
    const parsed = credentialActionSchema.parse(Object.fromEntries(form));
    const reason = parsed.action === "revoke" ? parsed.reason ?? "" : null;
    const result = await createAdminClient().rpc("transition_credential", { actor_user: user.id, target_credential: parsed.credential_id, requested_action: parsed.action, reason });
    if (result.error) return fail(parsed.action === "issue" ? "Credential could not be approved." : "Credential could not be revoked.");
    refreshAdmin();
    return ok(parsed.action === "issue" ? "Credential approved and issued." : "Credential revoked.");
  } catch { return fail(); }
}

export async function updateBadgeAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    await requirePlatformAdmin();
    const parsed = badgeSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().from("badges").update({
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      level: parsed.level,
      active: parsed.active,
    }).eq("id", parsed.badge_id);
    if (result.error) return fail("Badge metadata was not updated.");
    refreshAdmin();
    return ok("Badge metadata updated.");
  } catch { return fail(); }
}
