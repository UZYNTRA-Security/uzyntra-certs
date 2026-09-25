import { requirePageUser } from "@/lib/auth/guards";
import { DashboardNav } from "@/components/candidate/dashboard-nav";
import { LogoutButton } from "@/components/auth/logout-button";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-14"><aside className="space-y-6"><div className="px-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Candidate portal</p><p className="mt-2 text-xs text-muted-foreground">Your professional identity</p></div><DashboardNav /><div className="px-4"><LogoutButton /></div></aside><div className="min-w-0 space-y-8">{children}</div></div>;
}
