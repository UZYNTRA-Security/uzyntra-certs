import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationMemberRole } from "@/types/database";
export async function getIssuer() {
  const user = await requireUser();
  const client=await createClient();const members=await client.from("organization_members").select("*").eq("user_id",user.id).eq("status","ACTIVE").order("created_at");
  if(members.error)throw new Error("Organization access could not be checked.");if(!members.data.length)return null;
  const organizations=await client.from("organizations").select("*").in("id",members.data.map(m=>m.organization_id));if(organizations.error)throw new Error("Organizations could not be loaded.");
  const requested=(await cookies()).get("uzyntra-organization")?.value;const member=members.data.find(m=>organizations.data.some(o=>o.id===m.organization_id&&o.slug===requested))||members.data[0];const organization=organizations.data.find(o=>o.id===member.organization_id);if(!organization)return null;
  return {user,member,organization,memberships:members.data.map(m=>({member:m,organization:organizations.data.find(o=>o.id===m.organization_id)!})).filter(v=>v.organization),issuer:{...member,issuer_name:organization.name,active:true}};
}
export async function requireIssuer(roles:OrganizationMemberRole[]=["ADMIN","REVIEWER","ISSUER"]) {
  const value = await getIssuer();
  if (!value || !roles.includes(value.member.role)) throw new Error("Organization permission is required.");
  return value;
}
export async function requireIssuerPage() {
  const value = await getIssuer();
  if (!value) redirect("/dashboard");
  return value;
}
