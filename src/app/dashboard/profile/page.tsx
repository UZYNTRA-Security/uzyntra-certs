import Link from "next/link";
import { getCandidate } from "@/lib/candidate/data";
import { ProfileForm } from "@/components/candidate/profile-form";
import { AvatarEditor } from "@/components/candidate/avatar-editor";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("Edit profile", "Manage your professional profile.", "/dashboard/profile", false);
export default async function ProfilePage() {
  const { user, profile } = await getCandidate();
  return <><header><h1 className="text-3xl font-semibold">My profile</h1><p className="mt-3 text-muted-foreground">Build your professional identity. You choose what to share.</p>{profile.visibility === "public" && profile.username && <Link href={`/profile/${profile.username}`} className="mt-3 inline-block text-sm text-primary underline">View public profile</Link>}</header><AvatarEditor userId={user.id} name={profile.full_name} src={profile.avatar_url ? `/api/avatar?v=${encodeURIComponent(profile.avatar_updated_at || "")}` : null} /><ProfileForm profile={profile} /></>;
}
