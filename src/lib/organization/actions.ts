"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireIssuer } from "@/lib/issuer/guards";
import { requirePlatformAdmin } from "@/lib/admin/data";

type State = { status: "idle" | "success" | "error"; message?: string };
const ok = (message: string): State => ({ status: "success", message });
const fail = (message: string): State => ({ status: "error", message });

const orgTypes = ["SECURITY_COMPANY", "UNIVERSITY", "TRAINING_PROVIDER", "TRAINING_INSTITUTE", "SOFTWARE_HOUSE", "COMPANY", "GOVERNMENT", "COMMUNITY"] as const;
const applicationSchema = z.object({
  organization_name: z.string().trim().min(2).max(160),
  organization_type: z.enum(orgTypes),
  website: z.string().trim().url().refine((value) => value.startsWith("https://"), "Use an HTTPS website."),
  official_email: z.email().trim().toLowerCase(),
  country: z.string().trim().max(100).transform((value) => value || null),
  description: z.string().trim().min(20).max(2000),
  logo_url: z.string().trim().max(2048).transform((value) => value || null),
});
const reviewSchema = z.object({
  application_id: z.uuid(),
  status: z.enum(["UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"]),
  note: z.string().trim().max(1000).transform((value) => value || null),
});
const inviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
  role: z.enum(["ADMIN", "REVIEWER", "ISSUER", "VIEWER"]),
});
const settingsSchema = z.object({
  issuer_display_name: z.string().trim().min(2).max(160),
  brand_color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).or(z.literal("")).transform((value) => value || null),
  certificate_footer_text: z.string().trim().max(240).transform((value) => value || null),
  logo_url: z.string().trim().max(2048).transform((value) => value || null),
});

export async function submitOrganizationApplicationAction(_state: State, form: FormData): Promise<State> {
  try {
    const user = await requireUser();
    const parsed = applicationSchema.parse(Object.fromEntries(form));
    const slug = slugify(parsed.organization_name);
    const admin = createAdminClient();
    const existing = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existing.data) return fail("An organization with this name already exists.");
    const created = await admin.from("organization_applications").insert({
      organization_name: parsed.organization_name,
      organization_slug: slug,
      organization_type: parsed.organization_type,
      website: parsed.website,
      official_email: parsed.official_email,
      country: parsed.country,
      description: parsed.description,
      logo_url: parsed.logo_url,
      applicant_user_id: user.id,
    });
    if (created.error) return fail("Organization application could not be submitted. Check if this organization was already submitted.");
    revalidatePath("/organizations/register");
    return ok("Organization application submitted. UZYNTRA will review it before issuer access is enabled.");
  } catch { return fail("Enter valid organization details."); }
}

export async function reviewOrganizationApplicationAction(_state: State, form: FormData): Promise<State> {
  try {
    const { user } = await requirePlatformAdmin();
    const parsed = reviewSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().rpc("admin_review_organization_application", { actor_user: user.id, target_application: parsed.application_id, new_status: parsed.status, note: parsed.note });
    if (result.error) return fail("Organization application could not be reviewed.");
    revalidatePath("/admin/organizations");
    revalidatePath("/admin");
    return ok(`Application marked ${parsed.status.toLowerCase().replaceAll("_", " ")}.`);
  } catch { return fail("Application review failed."); }
}

export async function inviteOrganizationMemberAction(_state: State, form: FormData): Promise<State> {
  try {
    const { user, organization } = await requireIssuer(["ADMIN"]);
    const parsed = inviteSchema.parse(Object.fromEntries(form));
    const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
    const result = await createAdminClient().from("organization_invites").insert({ organization_id: organization.id, email: parsed.email, role: parsed.role, invited_by: user.id, token_hash: tokenHash });
    if (result.error) return fail("Invitation could not be created. The email may already have an invite.");
    revalidatePath("/organization/team");
    return ok("Invitation created. Email sending will be connected in a later notification phase.");
  } catch { return fail("Only organization admins can invite members."); }
}

export async function updateOrganizationSettingsAction(_state: State, form: FormData): Promise<State> {
  try {
    const { user, organization } = await requireIssuer(["ADMIN"]);
    const parsed = settingsSchema.parse(Object.fromEntries(form));
    const result = await createAdminClient().from("organization_settings").upsert({ organization_id: organization.id, ...parsed, updated_by: user.id, updated_at: new Date().toISOString() });
    if (result.error) return fail("Organization settings could not be saved.");
    revalidatePath("/organization/settings");
    revalidatePath(`/organizations/${organization.slug}`);
    return ok("Organization branding settings saved.");
  } catch { return fail("Only organization admins can update settings."); }
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `organization-${Date.now()}`;
}
