import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { avatarPath, MAX_AVATAR_BYTES, ownedDraft, validateAvatarFile } from "../src/lib/candidate/avatar";
import { optimizeAvatar } from "../src/lib/candidate/image";
import { credentialStatus, profileSchema, publicProfileSchema } from "../src/lib/candidate/schema";

const user = "11111111-1111-4111-8111-111111111111";
test("avatar validation accepts supported images and rejects invalid type and size", () => {
  assert.doesNotThrow(() => validateAvatarFile({ type: "image/webp", size: 1000 }));
  assert.throws(() => validateAvatarFile({ type: "image/svg+xml", size: 1000 }), /PNG/);
  assert.throws(() => validateAvatarFile({ type: "image/jpeg", size: MAX_AVATAR_BYTES + 1 }), /5 MB/);
});
test("avatar paths are scoped to the authenticated owner", () => {
  const own = `${user}/draft-33333333-3333-4333-8333-333333333333.png`;
  assert.equal(ownedDraft(user, own), own);
  assert.equal(avatarPath(user), `${user}/profile-image.webp`);
  assert.throws(() => ownedDraft(user, `22222222-2222-4222-8222-222222222222/draft-33333333-3333-4333-8333-333333333333.png`), /belong/);
  assert.throws(() => ownedDraft(user, `${user}/profile-image.webp`), /belong/);
});
test("valid images are decoded, cropped and optimized while malformed bytes are rejected", async () => {
  const source = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#00ff88" } }).jpeg().toBuffer();
  const result = await optimizeAvatar(source, "image/jpeg");
  const metadata = await sharp(result).metadata();
  assert.deepEqual([metadata.format, metadata.width, metadata.height], ["webp", 512, 512]);
  await assert.rejects(optimizeAvatar(new Uint8Array([1, 2, 3]), "image/jpeg"), /invalid/);
  await assert.rejects(optimizeAvatar(source, "image/png"), /invalid/);
});
test("profile input normalizes usernames and only permits safe HTTPS links", () => {
  const parsed = profileSchema.parse({ full_name: " Alice ", username: "Alice-Sec", headline: "", bio: "", country: "", linkedin_url: "https://linkedin.com/in/alice", github_url: "https://github.com/alice", portfolio_url: "https://alice.example", visibility: "public" });
  assert.equal(parsed.username, "alice-sec");
  assert.equal(parsed.headline, null);
  assert.equal(profileSchema.safeParse({ ...parsed, linkedin_url: "https://evil.example/alice" }).success, false);
  assert.equal(profileSchema.safeParse({ ...parsed, portfolio_url: "javascript:alert(1)" }).success, false);
});
test("public profile projection rejects private fields", () => {
  const safe = { username: "alice-sec", full_name: "Alice", headline: null, bio: null, country: null, linkedin_url: null, github_url: null, portfolio_url: null, has_avatar: false, avatar_updated_at: null, credentials: [] };
  assert.deepEqual(publicProfileSchema.parse({ ...safe, email: "private@example.com", id: user }), safe);
  assert.equal(credentialStatus({ status: "ISSUED", issue_date: "2020-01-01", expiry_date: "2020-01-02" }, "2026-01-01"), "EXPIRED");
});
