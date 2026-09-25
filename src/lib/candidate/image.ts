import sharp from "sharp";
import { validateAvatarFile } from "./avatar";

// Full decode/re-encode rejects malformed files, strips metadata, and limits decompression.
export async function optimizeAvatar(bytes: Uint8Array, type: string) {
  validateAvatarFile({ size: bytes.byteLength, type });
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning", animated: false });
    const metadata = await image.metadata();
    const types: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
    if (!metadata.format || types[metadata.format] !== type || (metadata.pages || 1) > 1) throw new Error("Invalid image");
    return await image.rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  } catch { throw new Error("This image is invalid or too large to process. Choose another image."); }
}
