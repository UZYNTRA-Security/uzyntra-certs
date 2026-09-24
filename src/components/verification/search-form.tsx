"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { credentialIdSchema } from "@/lib/verification/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function VerificationSearch() {
  const router = useRouter();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = credentialIdSchema.safeParse(new FormData(event.currentTarget).get("credential_id"));
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError(""); router.push(`/v/${encodeURIComponent(result.data)}`);
  }
  return <form onSubmit={submit} className="space-y-5">
    <label htmlFor="credential_id" className="block text-sm font-medium">Credential ID</label>
    <Input name="credential_id" id="credential_id" placeholder="UZY-CERT-2026-A82KD" maxLength={100} required autoComplete="off" spellCheck={false} aria-invalid={!!error} aria-describedby="credential-help" />
    <p id="credential-help" className="text-sm text-muted-foreground">Enter the complete ID from the credential or use the verification link shared by its holder.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit">Verify credential</Button>
  </form>;
}
