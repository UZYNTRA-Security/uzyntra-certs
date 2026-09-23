import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Authentication error", robots: { index: false, follow: false } };

export default function AuthErrorPage() {
  return <div className="mx-auto max-w-6xl space-y-5 px-6 py-20">
    <h1 className="text-3xl font-semibold">Unable to complete confirmation</h1>
    <p className="max-w-xl text-muted-foreground">This link may be expired, already used, or opened in a different browser from the one used to register. If your email is already confirmed, sign in with your password.</p>
    <Button asChild><Link href="/login">Go to sign in</Link></Button>
  </div>;
}
