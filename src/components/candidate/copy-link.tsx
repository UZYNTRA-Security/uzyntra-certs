"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function CopyLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  return <div><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage("Link copied."); } catch { setMessage("Copy unavailable. Select the verification URL below."); } }}>Copy verification URL</Button><span className="block text-xs text-muted-foreground" role="status">{message}</span></div>;
}
