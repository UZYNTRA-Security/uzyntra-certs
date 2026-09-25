"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileSchema } from "./schema";
import { avatarPath, ownedDraft } from "./avatar";
import { optimizeAvatar } from "./image";

export type ProfileState = { status: "idle" | "success" | "error"; message?: string };
const failed: ProfileState = { status: "error", message: "Unable to save changes. Check your connection and try again." };
function refresh() { revalidatePath("/dashboard", "layout"); revalidatePath("/profile/[username]", "page"); }

export async function saveProfileAction(_state: ProfileState, form: FormData): Promise<ProfileState> {
  try {
    const user = await requireUser();
    const input = profileSchema.safeParse(Object.fromEntries(form));
    if (!input.success) return { status: "error", message: input.error.issues[0].message };
    const client = await createClient("write");
    const { data, error } = await client.from("profiles").update(input.data).eq("id", user.id).select("id").single();
    if (error?.code === "23505") return { status: "error", message: "That username is already taken. Please choose another." };
    if (error || !data) return failed;
    refresh(); return { status: "success", message: "Profile saved successfully." };
  } catch { return failed; }
}

export async function saveAvatarAction(draft: string): Promise<ProfileState> {
  try {
    const user = await requireUser();
    const path = ownedDraft(user.id, draft);
    const client = await createClient("write");
    const bucket = client.storage.from("avatars");
    try {
      const { data, error } = await bucket.download(path);
      if (error || !data) return failed;
      let optimized: Buffer;
      try { optimized = await optimizeAvatar(new Uint8Array(await data.arrayBuffer()), data.type); }
      catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid image." }; }
      // The destination always comes from the verified session, never client input.
      const admin = createAdminClient();
      const canonical = avatarPath(user.id);
      const upload = await admin.storage.from("avatars").upload(canonical, optimized, { contentType: "image/webp", upsert: true, cacheControl: "0" });
      if (upload.error) return failed;
      const updated = await admin.from("profiles").update({ avatar_url: canonical, avatar_updated_at: new Date().toISOString() }).eq("id", user.id).select("id").single();
      if (updated.error) return failed;
      refresh(); return { status: "success", message: "Profile photo saved." };
    } finally { await bucket.remove([path]); }
  } catch { return failed; }
}

export async function removeAvatarAction(): Promise<ProfileState> {
  try {
    const user = await requireUser();
    const admin = createAdminClient();
    // Hide first, then remove bytes. Never leave a publicly readable pointer after deletion.
    const { error } = await admin.from("profiles").update({ avatar_url: null, avatar_updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) return failed;
    const removal = await admin.storage.from("avatars").remove([avatarPath(user.id)]);
    refresh();
    if (removal.error) return { status: "error", message: "Photo hidden, but storage removal failed. Please retry Remove photo." };
    return { status: "success", message: "Profile photo removed." };
  } catch { return failed; }
}
