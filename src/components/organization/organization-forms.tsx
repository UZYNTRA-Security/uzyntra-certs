"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteOrganizationMemberAction, reviewOrganizationApplicationAction, submitOrganizationApplicationAction, updateOrganizationSettingsAction } from "@/lib/organization/actions";

const initial = { status: "idle" as const };
const orgTypes = [
  ["UNIVERSITY", "University"],
  ["TRAINING_INSTITUTE", "Training Institute"],
  ["SOFTWARE_HOUSE", "Software House"],
  ["COMPANY", "Company"],
  ["GOVERNMENT", "Government"],
  ["COMMUNITY", "Community"],
  ["SECURITY_COMPANY", "Security Company"],
  ["TRAINING_PROVIDER", "Training Provider"],
];

function Status({ state }: { state: { status: string; message?: string } }) {
  return state.message ? <p role="status" className={`text-sm ${state.status === "error" ? "text-destructive" : "text-primary"}`}>{state.message}</p> : null;
}

export function OrganizationApplicationForm() {
  const [state, action, pending] = useActionState(submitOrganizationApplicationAction, initial);
  return <form action={action} className="grid gap-5 rounded-2xl border border-primary/20 bg-card p-6">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm"><span>Organization name</span><Input name="organization_name" required maxLength={160} /></label>
      <label className="space-y-2 text-sm"><span>Organization type</span><select name="organization_type" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">{orgTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-2 text-sm"><span>Website</span><Input name="website" type="url" placeholder="https://example.edu" required /></label>
      <label className="space-y-2 text-sm"><span>Official email</span><Input name="official_email" type="email" placeholder="admin@example.edu" required /></label>
      <label className="space-y-2 text-sm"><span>Country</span><Input name="country" maxLength={100} /></label>
      <label className="space-y-2 text-sm"><span>Logo URL</span><Input name="logo_url" placeholder="/brand/logo.svg or leave blank" /></label>
    </div>
    <label className="space-y-2 text-sm"><span>Description</span><textarea name="description" required minLength={20} maxLength={2000} rows={5} className="w-full rounded-md border bg-background p-3" /></label>
    <div className="flex flex-wrap items-center gap-3"><Button disabled={pending}>{pending ? "Submitting..." : "Submit for review"}</Button><Status state={state} /></div>
  </form>;
}

export function ApplicationReviewForm({ applicationId, status }: { applicationId: string; status: string }) {
  const [state, action, pending] = useActionState(reviewOrganizationApplicationAction, initial);
  return <form action={action} className="flex flex-wrap items-center gap-2">
    <input type="hidden" name="application_id" value={applicationId} />
    <select name="status" defaultValue={status === "PENDING" ? "UNDER_REVIEW" : status} className="h-9 rounded-md border bg-background px-2 text-sm">
      {["UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"].map((value) => <option key={value}>{value}</option>)}
    </select>
    <Input name="note" placeholder="Review note" className="h-9 w-44" />
    <Button size="sm" disabled={pending}>Apply</Button>
    <Status state={state} />
  </form>;
}

export function OrganizationInviteForm() {
  const [state, action, pending] = useActionState(inviteOrganizationMemberAction, initial);
  return <form action={action} className="grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-[1fr_160px_auto]">
    <Input name="email" type="email" placeholder="member@organization.com" required />
    <select name="role" className="h-10 rounded-md border bg-background px-3 text-sm">{["ISSUER", "REVIEWER", "VIEWER", "ADMIN"].map((role) => <option key={role}>{role}</option>)}</select>
    <Button disabled={pending}>{pending ? "Inviting..." : "Create invite"}</Button>
    <div className="md:col-span-3"><Status state={state} /></div>
  </form>;
}

export function OrganizationSettingsForm({ settings, organizationName }: { settings?: { issuer_display_name?: string | null; brand_color?: string | null; certificate_footer_text?: string | null; logo_url?: string | null } | null; organizationName: string }) {
  const [state, action, pending] = useActionState(updateOrganizationSettingsAction, initial);
  return <form action={action} className="grid gap-5 rounded-xl border bg-card p-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm"><span>Issuer display name</span><Input name="issuer_display_name" required maxLength={160} defaultValue={settings?.issuer_display_name || organizationName} /></label>
      <label className="space-y-2 text-sm"><span>Brand color</span><Input name="brand_color" placeholder="#68e09d" pattern="#[0-9A-Fa-f]{6}" defaultValue={settings?.brand_color || ""} /></label>
      <label className="space-y-2 text-sm md:col-span-2"><span>Logo URL</span><Input name="logo_url" defaultValue={settings?.logo_url || ""} placeholder="/brand/logo.svg" /></label>
    </div>
    <label className="space-y-2 text-sm"><span>Certificate footer text</span><Input name="certificate_footer_text" maxLength={240} defaultValue={settings?.certificate_footer_text || ""} placeholder="Issued by organization name, verified by UZYNTRA Certs" /></label>
    <p className="text-xs text-muted-foreground">Organization branding can identify the issuer, but UZYNTRA Certs remains the verification authority and controls verification URLs and trust marks.</p>
    <div className="flex flex-wrap items-center gap-3"><Button disabled={pending}>{pending ? "Saving..." : "Save settings"}</Button><Status state={state} /></div>
  </form>;
}
