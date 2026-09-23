"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-6xl space-y-5 px-6 py-20">
    <h1 className="text-3xl font-semibold">Something went wrong</h1>
    <p className="text-muted-foreground">Please try again. If the problem continues, come back later.</p>
    {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
    <Button onClick={reset}>Try again</Button>
  </div>;
}
