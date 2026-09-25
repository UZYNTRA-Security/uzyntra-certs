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
const organizationCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  organization_type: z.enum(["SECURITY_COMPANY", "UNIVERSITY", "TRAINING_PROVIDER", "CORPORATE", "COMMUNITY"]),
  verified_status: z.enum(["PENDING", "VERIFIED", "SUSPENDED"]).default("PENDING"),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().optional(),
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
const resetSchema = z.object({ email: z.email().trim().toLowerCase() });

export async function createOrganizationAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    const { user } = await requirePlatformAdmin();
    const parsed = organizationCreateSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().rpc("admin_create_organization", { actor_user: user.id, new_name: parsed.name, new_slug: parsed.slug, new_type: parsed.organization_type, new_description: parsed.description || null, new_website: parsed.website || null, new_status: parsed.verified_status });
    if (result.error) return fail(result.error.code === "23505" ? "That organization slug already exists." : "Organization was not created.");
    refreshAdmin();
    return ok("Organization created for internal management.");
  } catch { return fail("Enter valid organization details."); }
}

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

export async function generatePasswordResetLinkAction(_state: AdminState, form: FormData): Promise<AdminState> {
  try {
    await requirePlatformAdmin();
    const parsed = resetSchema.parse(Object.fromEntries(form));
    const admin = createAdminClient();
    const result = await admin.auth.admin.generateLink({ type: "recovery", email: parsed.email, options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://certs.uzyntra.com"}/reset-password` } });
    if (result.error) return fail("Password reset link could not be generated.");
    return ok(result.data.properties?.action_link || "Password reset link generated.");
  } catch { return fail("Enter a valid account email."); }
}
