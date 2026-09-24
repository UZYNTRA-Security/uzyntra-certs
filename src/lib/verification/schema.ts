import { z } from "zod";
export const credentialIdSchema = z.string().trim().toUpperCase().max(100).regex(/^UZY-[A-Z0-9]{2,16}-[0-9]{4}-[A-Z0-9]{5,64}$/, "Enter the complete credential ID provided by UZYNTRA.");
export const publicCredentialSchema = z.object({
  credential_id: credentialIdSchema,
  title: z.string().min(1).max(240), holder_name: z.string().min(1).max(160), issuer: z.literal("UZYNTRA Security"),
  credential_type: z.enum(["COURSE_CERTIFICATE", "INTERNSHIP", "EMPLOYMENT", "CONTRIBUTION", "BUG_BOUNTY", "APPRECIATION", "ACHIEVEMENT"]),
  issue_date: z.iso.date(), expiry_date: z.iso.date().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "REVOKED", "SUSPENDED", "NOT_YET_VALID"]),
  badges: z.array(z.object({ name: z.string().max(160), slug: z.string(), icon_url: z.string().regex(/^\/badges\/[a-zA-Z0-9_-]+\.(png|svg|webp|jpg|jpeg)$/), category: z.string(), level: z.string().nullable() })),
});
export const verificationResultSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("found"), credential: publicCredentialSchema }),
  z.object({ outcome: z.literal("not_found") }),
  z.object({ outcome: z.literal("rate_limited") }),
]);
export type PublicCredential = z.infer<typeof publicCredentialSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema> | { outcome: "unavailable" };
