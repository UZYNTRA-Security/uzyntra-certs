import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { pageMetadata } from "@/lib/metadata";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata = pageMetadata("Account security", "Manage your account security.", "/dashboard/security", false);
export default async function SecurityPage() {
  const user = await requirePageUser();
  return <div className="mx-auto max-w-4xl space-y-8 px-6 py-20"><h1 className="text-3xl font-semibold">Account security</h1><div className="grid gap-5 sm:grid-cols-2">
    <Card><CardHeader><CardTitle>Change password</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm">Use a secure email link to choose a new password.</p><Link className="text-primary underline" href="/forgot-password">Request password reset</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Email verification</CardTitle></CardHeader><CardContent><p className="break-all">{user.email}</p><p className="text-sm text-primary">Verified</p></CardContent></Card>
    {["Multi-factor authentication", "Active sessions", "Delete account"].map((title) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Planned for a future release. No controls are available yet.</p></CardContent></Card>)}
  </div><Link href="/dashboard" className="text-primary underline">Return to your account</Link></div>;
}
