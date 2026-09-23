import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Authentication error" };

export default function AuthErrorPage() {
  return <div className="mx-auto max-w-6xl space-y-5 px-6 py-20">
    <h1 className="text-3xl font-semibold">Unable to complete sign-in</h1>
    <p className="text-muted-foreground">The authentication link may be invalid or expired. Request a new link from your administrator.</p>
    <Button asChild><Link href="/">Return home</Link></Button>
  </div>;
}
