"use client";
import { useState } from "react";
import { initials } from "@/lib/candidate/schema";
export function Avatar({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 text-2xl font-semibold text-primary">
    {src && failed !== src ? /* Private images must bypass the Next image cache. */
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`${name || "Candidate"} profile photo`} width={80} height={80} className="size-full object-cover" onError={() => setFailed(src)} /> : <span aria-label={`${name || "Candidate"} initials`}>{initials(name)}</span>}
  </div>;
}
