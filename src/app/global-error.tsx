"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main role="alert">
    <h1>UZYNTRA Certs is temporarily unavailable</h1>
    <p>Please try again in a moment.</p>
    <button onClick={reset}>Try again</button>
  </main></body></html>;
}
