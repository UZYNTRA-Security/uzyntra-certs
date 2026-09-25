import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export async function getIssuer() {
  const user = await requireUser();
  const { data, error } = await (await createClient()).from("credential_issuers").select("*").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (error) throw new Error("Issuer access could not be checked.");
  return data ? { user, issuer: data } : null;
}
export async function requireIssuer(roles?: Array<"ISSUER"|"REVIEWER"|"ADMIN">) {
  const value = await getIssuer();
  if (!value || (roles && !roles.includes(value.issuer.role))) throw new Error("Issuer permission is required.");
  return value;
}
export async function requireIssuerPage() {
  const value = await getIssuer();
  if (!value) redirect("/dashboard");
  return value;
}
