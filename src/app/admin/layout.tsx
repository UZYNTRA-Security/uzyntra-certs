import { AdminNav } from "@/components/admin/admin-nav";
import { requirePlatformAdmin } from "@/lib/admin/data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
    <header className="overflow-hidden rounded-xl border border-primary/20 bg-[linear-gradient(135deg,rgba(108,222,160,.14),rgba(255,255,255,.03)_34%,rgba(17,21,28,.92))] p-6 shadow-xl shadow-primary/5">
      <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-xs uppercase tracking-[.2em] text-primary">UZYNTRA staff operations</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">Internal credential, organization, member, badge and audit operations.</p>
      </div>
      <AdminNav />
      </div>
    </header>
    {children}
  </div>;
}
