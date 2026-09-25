import { requireIssuerPage } from "@/lib/issuer/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Organization members", "Review issuer roles and membership status.", "/issuer/members", false);

export default async function MembersPage() {
  const { organization, member } = await requireIssuerPage();
  const admin = createAdminClient();
  const { data: members } = await admin.from("organization_members").select("id,user_id,role,status,created_at").eq("organization_id", organization.id).order("created_at");
  const ids = members?.map((item) => item.user_id) ?? [];
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id,full_name,username").in("id", ids) : { data: [] };
  const profileMap = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);
  return <section className="space-y-5"><div><h2 className="text-2xl font-semibold">Organization members</h2><p className="mt-2 text-sm text-muted-foreground">Roles control credential access for {organization.name}. Membership changes are reserved for organization administrators.</p></div><div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-muted/40"><tr><th className="p-3">Member</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th></tr></thead><tbody>{members?.map((item) => { const profile = profileMap.get(item.user_id); return <tr className="border-t" key={item.id}><td className="p-3"><p className="font-medium">{profile?.full_name || profile?.username || "Organization member"}</p><p className="font-mono text-xs text-muted-foreground">{item.user_id}</p></td><td className="p-3">{item.role}</td><td className="p-3">{item.status}</td><td className="p-3">{new Date(item.created_at).toLocaleDateString()}</td></tr>; })}</tbody></table>{!members?.length && <p className="p-8 text-center text-muted-foreground">No organization members.</p>}</div><p className="text-xs text-muted-foreground">Your permission level: {member.role}.</p></section>;
}
