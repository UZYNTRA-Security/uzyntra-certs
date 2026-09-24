import { z } from "zod";

const value = z.string().min(1).max(4096);
export const recoveryProofSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("token"), value }),
  z.object({ kind: z.literal("code"), value, flowId: z.string().min(1).max(256).optional() }),
]);
export type RecoveryProof = z.infer<typeof recoveryProofSchema>;

export function recoveryProofFromUrl(params: Record<string, string | string[] | undefined>): RecoveryProof | null {
  if (params.error !== undefined || params.error_code !== undefined || params.error_description !== undefined) return null;
  if (params.code !== undefined && params.token_hash !== undefined) return null;
  if (params.type !== undefined && params.type !== "recovery") return null;
  const input = params.code !== undefined
    ? { kind: "code", value: params.code, flowId: params.sb_flow_id }
    : params.type === "recovery" ? { kind: "token", value: params.token_hash } : null;
  const parsed = recoveryProofSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function recoveryOrigin(configuredOrigin: string, development: boolean) {
  // Development defaults to the local app even when canonical metadata uses production.
  return development ? "http://localhost:3000" : configuredOrigin;
}
