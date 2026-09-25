export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
export function validateAvatarFile(file: { size: number; type: string }) {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Choose a PNG, JPG, JPEG or WebP image.");
  if (file.size === 0 || file.size > MAX_AVATAR_BYTES) throw new Error("Choose an image up to 5 MB.");
}
export function ownedDraft(userId: string, path: string) {
  if (!/^[a-f0-9-]{36}$/.test(userId) || !new RegExp(`^${userId}/draft-[a-f0-9-]{36}\\.(webp|jpg|png)$`).test(path)) throw new Error("This upload does not belong to your account.");
  return path;
}
export function avatarPath(userId: string) {
  if (!/^[a-f0-9-]{36}$/.test(userId)) throw new Error("Invalid account.");
  return `${userId}/profile-image.webp`;
}
