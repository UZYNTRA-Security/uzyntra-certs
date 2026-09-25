"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { validateAvatarFile } from "@/lib/candidate/avatar";
import { removeAvatarAction, saveAvatarAction } from "@/lib/candidate/actions";

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
export function AvatarEditor({ userId, name, src }: { userId: string; name: string; src: string | null }) {
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const selection = useRef(0);
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => () => { image?.close(); }, [image]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const context = canvas.current.getContext("2d");
    if (!context) return;
    const side = Math.min(image.width, image.height) / zoom;
    context.clearRect(0, 0, 512, 512);
    context.drawImage(image, (image.width - side) * (position.x + 1) / 2, (image.height - side) * (position.y + 1) / 2, side, side, 0, 0, 512, 512);
    const thumbnail = preview.current?.getContext("2d");
    thumbnail?.clearRect(0, 0, 96, 96);
    thumbnail?.drawImage(canvas.current, 0, 0, 96, 96);
  }, [image, zoom, position]);

  async function select(file?: File) {
    const current = ++selection.current;
    if (!file) return;
    setMessage("");
    try {
      validateAvatarFile(file);
      const decoded = await createImageBitmap(file);
      if (current !== selection.current) { decoded.close(); return; }
      if (!decoded.width || !decoded.height || decoded.width * decoded.height > 40_000_000) { decoded.close(); throw new Error("Choose an image smaller than 40 megapixels."); }
      setImage(decoded); setZoom(1); setPosition({ x: 0, y: 0 });
    } catch (error) { setImage(null); setMessage(error instanceof Error ? error.message : "This image could not be opened."); }
  }

  async function save() {
    if (!canvas.current || !image || busy) return;
    setBusy(true); setMessage("");
    let path: string | null = null;
    try {
      const output = await new Promise<Blob | null>((resolve) => canvas.current!.toBlob(resolve, "image/webp", 0.85));
      const blob = output?.type === "image/webp" ? output : await new Promise<Blob | null>((resolve) => canvas.current!.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("Your browser could not prepare this image.");
      validateAvatarFile(blob);
      path = `${userId}/draft-${crypto.randomUUID()}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
      const client = createClient();
      const { error } = await client.storage.from("avatars").upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw new Error("Upload failed. Check your connection and try again.");
      const result = await saveAvatarAction(path);
      setMessage(result.message || "");
      if (result.status === "success") { setImage(null); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the photo. Please try again."); }
    finally {
      if (path) { try { await createClient().storage.from("avatars").remove([path]); } catch { /* Server finalization also cleans drafts. */ } }
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true); setMessage("");
    try { const result = await removeAvatarAction(); setMessage(result.message || ""); if (result.status === "success") { setImage(null); router.refresh(); } }
    catch { setMessage("Could not remove the photo. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="photo-heading" className="space-y-5 rounded-xl border border-border bg-card p-6">
    <div className="flex flex-wrap items-center gap-5"><Avatar name={name} src={src} /><div><h2 id="photo-heading" className="font-semibold">Profile photo</h2><p className="mt-1 text-sm text-muted-foreground">PNG, JPG, JPEG or WebP. Maximum 5 MB.</p><p className="mt-1 text-xs text-muted-foreground">Photos follow your profile visibility.</p></div></div>
    <label className="block text-sm font-medium">Upload or replace photo<input className="mt-2 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { void select(event.target.files?.[0]); event.target.value = ""; }} /></label>
    {image && <div className="space-y-4"><p className="text-sm text-muted-foreground">Drag to position your photo, or use the sliders. The square preview is what will be saved.</p><div className="flex flex-wrap items-end gap-5"><canvas ref={canvas} width={512} height={512} aria-label="Square photo crop" className="aspect-square w-full max-w-72 touch-none cursor-move rounded-lg border border-primary/30 bg-background"
      onPointerDown={(event) => { if (busy) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, px: position.x, py: position.y }; }}
      onPointerMove={(event) => { if (!drag.current || busy) return; const side = Math.min(image.width, image.height) / zoom; const scale = event.currentTarget.getBoundingClientRect().width / side; setPosition({ x: clamp(drag.current.px - 2 * (event.clientX - drag.current.x) / Math.max(1, (image.width - side) * scale)), y: clamp(drag.current.py - 2 * (event.clientY - drag.current.y) / Math.max(1, (image.height - side) * scale)) }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} /><div><p className="mb-2 text-xs text-muted-foreground">Cropped preview</p><canvas ref={preview} width={96} height={96} aria-label="Cropped photo preview" className="rounded-xl border border-border" /></div></div>
      <label className="block text-sm">Zoom<input aria-label="Photo zoom" type="range" min="1" max="3" step="0.01" value={zoom} disabled={busy} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 block w-full max-w-72 accent-primary" /></label>
      {(["x", "y"] as const).map((axis) => <label key={axis} className="block text-sm">{axis === "x" ? "Horizontal position" : "Vertical position"}<input type="range" min="-1" max="1" step="0.01" value={position[axis]} disabled={busy} onChange={(event) => setPosition((previous) => ({ ...previous, [axis]: Number(event.target.value) }))} className="mt-2 block w-full max-w-72 accent-primary" /></label>)}
      <div className="flex gap-3"><Button type="button" disabled={busy} onClick={save}>{busy ? "Saving photo..." : "Save photo"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setImage(null)}>Cancel crop</Button></div></div>}
    <Button type="button" variant="outline" disabled={busy} onClick={remove}>Remove photo</Button>
    <p role="status" aria-live="polite" className="text-sm text-primary">{message}</p>
  </section>;
}
