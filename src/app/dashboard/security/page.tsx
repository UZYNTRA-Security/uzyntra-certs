import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { pageMetadata } from "@/lib/metadata";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export const metadata = pageMetadata("Account security", "Manage your account security.", "/dashboard/security", false);
export default async function SecurityPage() {
  const user = await requirePageUser();
  return <><header><h1 className="text-3xl font-semibold">Account security</h1><p className="mt-3 text-muted-foreground">Protect access to your professional identity.</p></header><div className="grid gap-5 sm:grid-cols-2">
    <Card><CardHeader><CardTitle>Change password</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Confirm access to your email with a secure recovery link, then choose your new password.</p><Link className="text-primary underline" href="/forgot-password">Change password</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Account email</CardTitle></CardHeader><CardContent><p className="break-all">{user.email}</p><p className="mt-2 text-sm text-primary">{user.email_confirmed_at ? "Email verified" : "Verification pending"}</p></CardContent></Card>
    {["Multi-factor authentication", "Active sessions", "Security activity"].map((title) => <Card key={title}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Planned for a future release. No controls are available yet.</p></CardContent></Card>)}
  </div></>;
}
