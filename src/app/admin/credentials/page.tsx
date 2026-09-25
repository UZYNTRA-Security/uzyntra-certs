import Link from "next/link";
import { CredentialAdminForm } from "@/components/admin/admin-forms";
import { getAdminCredentials } from "@/lib/admin/data";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Credential operations", "Review and manage credentials.", "/admin/credentials", false);

const statuses = ["", "DRAFT", "PENDING_REVIEW", "ISSUED", "REVOKED", "EXPIRED"];

export default async function AdminCredentialsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams;
  const credentials = await getAdminCredentials(params.status, params.q);
  return <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold">Credential operations</h2>
      <p className="mt-2 text-sm text-muted-foreground">Review pending credentials, issue approved records, revoke credentials and inspect audit history.</p>
    </div>
    <form className="flex flex-wrap gap-3">
      <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        {statuses.map((status) => <option key={status} value={status}>{status || "All statuses"}</option>)}
      </select>
      <input name="q" defaultValue={params.q ?? ""} placeholder="Credential ID, title or candidate" className="h-10 min-w-72 rounded-md border bg-background px-3 text-sm" />
      <button className="rounded-md border px-4 text-sm hover:border-primary/40 hover:text-primary">Filter</button>
    </form>
    <div className="grid gap-4">
      {credentials.map((credential) => <article key={credential.id} className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">{credential.status}</p>
            <h3 className="mt-2 text-lg font-semibold">{credential.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{credential.profiles?.full_name || "Candidate"} · {credential.organization?.name || "Organization"}</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{credential.credential_id}</p>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Type</dt><dd>{credential.credential_type}</dd></div>
          <div><dt className="text-muted-foreground">Issue date</dt><dd>{credential.issue_date}</dd></div>
          <div><dt className="text-muted-foreground">Expires</dt><dd>{credential.expiry_date || "No expiry"}</dd></div>
          <div><dt className="text-muted-foreground">Events</dt><dd>{credential.events.length}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {credential.public_visible && <Link href={`/v/${credential.credential_id}`} className="text-sm text-primary underline">Public verification</Link>}
          <CredentialAdminForm credentialId={credential.id} status={credential.status} />
        </div>
        {credential.events.length > 0 && <details className="mt-5 rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Audit history</summary>
          <ul className="mt-3 space-y-2">{credential.events.map((event) => <li key={event.id} className="text-muted-foreground">{event.event_type} · {event.from_status || "none"} to {event.to_status || "none"} · {new Date(event.created_at).toLocaleString()}</li>)}</ul>
        </details>}
      </article>)}
      {!credentials.length && <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No credentials match this filter.</p>}
    </div>
  </section>;
}
