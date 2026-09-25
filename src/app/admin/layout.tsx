import { AdminNav } from "@/components/admin/admin-nav";
import { requirePlatformAdmin } from "@/lib/admin/data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-xs uppercase tracking-[.2em] text-primary">UZYNTRA staff operations</p>
        <h1 className="mt-3 text-3xl font-semibold">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">Internal credential, organization, member, badge and audit operations.</p>
      </div>
      <AdminNav />
    </header>
    {children}
  </div>;
}
