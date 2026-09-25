import { z } from "zod";
export const credentialInputSchema = z.object({
  title: z.string().trim().min(3).max(240), credential_type: z.enum(["COURSE_CERTIFICATE","INTERNSHIP","EMPLOYMENT","CONTRIBUTION","BUG_BOUNTY","APPRECIATION","ACHIEVEMENT"]),
  category: z.enum(["COURSE","INTERNSHIP","EMPLOYMENT","CONTRIBUTION","APPRECIATION","BUG_BOUNTY","ACHIEVEMENT"]),
  description: z.string().trim().max(5000).transform((v) => v || null), recipient_email: z.email().trim().toLowerCase(),
  issue_date: z.iso.date(), expiry_date: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null), badge_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
}).refine((data) => !data.expiry_date || data.expiry_date >= data.issue_date, { message: "Expiry date must be on or after the issue date.", path: ["expiry_date"] });
export const revokeSchema = z.object({ credential_id: z.uuid(), reason: z.string().trim().min(8).max(1000) });
export const badgeInputSchema = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), category: z.enum(["COURSE","SECURITY","CONTRIBUTION","INTERNSHIP","RECOGNITION"]), level: z.string().trim().max(80).transform((v) => v || null), draft_path: z.string() });
export type IssuerState = { status: "idle"|"success"|"error"; message?: string; credentialId?: string };
