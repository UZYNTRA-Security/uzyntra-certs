import { z } from "zod";
import type { Database, CredentialType } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,39}$/, "Use 3-40 lowercase letters, numbers, underscores or hyphens.");
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const url = (host?: string) => z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password && (!host || parsed.hostname === host || parsed.hostname === `www.${host}`); } catch { return false; }
}, host ? `Enter an HTTPS ${host} URL.` : "Enter a valid HTTPS URL.").transform((value) => value || null);
export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your full name.").max(160), username: usernameSchema,
  headline: optionalText(160), bio: optionalText(2000), country: optionalText(100),
  linkedin_url: url("linkedin.com"), github_url: url("github.com"), portfolio_url: url(),
  visibility: z.enum(["public", "private"]),
});
export const badgeSchema = z.object({ name: z.string(), slug: z.string(), icon_url: z.string().regex(/^\/(?:badges\/[a-zA-Z0-9_-]+\.(png|svg|webp|jpg|jpeg)|api\/badge\/[a-f0-9-]{36})$/), category: z.string(), level: z.string().nullable() });
export const candidateCredentialSchema = z.object({
  credential_id: z.string(), certificate_slug: z.string().optional(), title: z.string(), issuer: z.string().optional(), credential_type: z.enum(["COURSE_CERTIFICATE", "INTERNSHIP", "EMPLOYMENT", "CONTRIBUTION", "BUG_BOUNTY", "APPRECIATION", "ACHIEVEMENT"]),
  issue_date: z.string(), expiry_date: z.string().nullable(), status: z.enum(["ISSUED", "EXPIRED", "REVOKED"]), public_visible: z.boolean(), badges: z.array(badgeSchema),
});
export type CandidateCredential = z.infer<typeof candidateCredentialSchema>;
export type EarnedBadge = z.infer<typeof badgeSchema> & { credential_id: string; credential_title: string; earned_date: string; status: string; public_visible: boolean };
export const publicProfileSchema = z.object({
  username: usernameSchema, full_name: z.string(), headline: z.string().nullable(), bio: z.string().nullable(), country: z.string().nullable(),
  linkedin_url: z.string().nullable(), github_url: z.string().nullable(), portfolio_url: z.string().nullable(),
  has_avatar: z.boolean(), avatar_updated_at: z.string().nullable(), credentials: z.array(candidateCredentialSchema),
});
export const categories: Record<CredentialType, string> = { COURSE_CERTIFICATE: "Courses", INTERNSHIP: "Internships", EMPLOYMENT: "Employment", CONTRIBUTION: "Contributions", APPRECIATION: "Appreciations", BUG_BOUNTY: "Bug Bounty", ACHIEVEMENT: "Achievements" };
export function credentialStatus(credential: Pick<CandidateCredential, "status" | "issue_date" | "expiry_date">, today = new Date().toISOString().slice(0, 10)) {
  if (credential.status !== "ISSUED") return credential.status;
  if (credential.expiry_date && credential.expiry_date < today) return "EXPIRED";
  if (credential.issue_date > today) return "NOT_YET_VALID";
  return "ISSUED";
}
export function earnedBadges(credentials: CandidateCredential[]): EarnedBadge[] {
  return credentials.flatMap((c) => c.badges.map((badge) => ({ ...badge, credential_id: c.credential_id, credential_title: c.title, earned_date: c.issue_date, status: credentialStatus(c), public_visible: c.public_visible })));
}
export function profileStrength(profile: Profile) {
  const fields = [profile.full_name, profile.username, profile.avatar_url, profile.headline, profile.bio, profile.country, profile.linkedin_url || profile.github_url || profile.portfolio_url];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}
export function initials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U"; }
