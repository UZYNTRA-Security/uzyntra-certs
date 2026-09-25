import { z } from "zod";
export const credentialIdSchema = z.string().trim().toUpperCase().max(100).regex(/^UZY-[A-Z0-9]{2,16}-[0-9]{4}-[A-Z0-9]{5,64}$/, "Enter the complete credential ID provided by UZYNTRA.");
export const publicCredentialSchema = z.object({
  credential_id: credentialIdSchema,
  title: z.string().min(1).max(240), description: z.string().max(5000).nullable(), holder_name: z.string().min(1).max(160), issuer: z.string().min(1).max(160),
  credential_type: z.enum(["COURSE_CERTIFICATE", "INTERNSHIP", "EMPLOYMENT", "CONTRIBUTION", "BUG_BOUNTY", "APPRECIATION", "ACHIEVEMENT"]),
  issue_date: z.iso.date(), expiry_date: z.iso.date().nullable(),
  category: z.enum(["COURSE", "INTERNSHIP", "EMPLOYMENT", "CONTRIBUTION", "APPRECIATION", "BUG_BOUNTY", "ACHIEVEMENT"]),
  status: z.enum(["ISSUED", "EXPIRED", "REVOKED"]),
  profile_username: z.string().nullable(), has_avatar: z.boolean(), verified_at: z.iso.datetime({ offset: true }),
  badges: z.array(z.object({ name: z.string().max(160), slug: z.string(), icon_url: z.string().regex(/^\/badges\/[a-zA-Z0-9_-]+\.(png|svg|webp|jpg|jpeg)$/), category: z.string(), level: z.string().nullable() })),
});
export const verificationResultSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("found"), credential: publicCredentialSchema }),
  z.object({ outcome: z.literal("not_found") }),
  z.object({ outcome: z.literal("rate_limited") }),
]);
export type PublicCredential = z.infer<typeof publicCredentialSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema> | { outcome: "unavailable" };
