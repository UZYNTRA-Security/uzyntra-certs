"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminCredentialAction, createOrganizationAction, generatePasswordResetLinkAction, removeMemberAction, updateBadgeAction, updateOrganizationStatusAction, upsertMemberAction } from "@/lib/admin/actions";

const initial = { status: "idle" as const };

function Status({ message, error }: { message?: string; error?: boolean }) {
  return message ? <p role="status" className={`text-xs ${error ? "text-destructive" : "text-primary"}`}>{message}</p> : null;
}

export function OrganizationStatusForm({ organizationId, status }: { organizationId: string; status: string }) {
  const [state, action, pending] = useActionState(updateOrganizationStatusAction, initial);
  const [confirming, setConfirming] = useState(false);
  return <form action={action} className="flex flex-wrap items-center gap-2">
    <input type="hidden" name="organization_id" value={organizationId} />
    <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-2 text-sm">
      {["PENDING", "VERIFIED", "SUSPENDED"].map((value) => <option key={value}>{value}</option>)}
    </select>
    {!confirming ? <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>Change</Button> : <Button size="sm" disabled={pending}>Confirm</Button>}
    <Status message={state.message} error={state.status === "error"} />
  </form>;
}

export function OrganizationCreateForm() {
  const [state, action, pending] = useActionState(createOrganizationAction, initial);
  return <form action={action} className="grid gap-3 rounded-xl border border-primary/20 bg-card p-5 lg:grid-cols-[1fr_220px_180px_160px]">
    <Input name="name" placeholder="Organization name" required maxLength={160} />
    <Input name="slug" placeholder="organization-slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
    <select name="organization_type" className="h-10 rounded-md border bg-background px-3 text-sm">{["SECURITY_COMPANY", "UNIVERSITY", "TRAINING_PROVIDER", "CORPORATE", "COMMUNITY"].map((value) => <option key={value}>{value}</option>)}</select>
    <select name="verified_status" className="h-10 rounded-md border bg-background px-3 text-sm">{["PENDING", "VERIFIED", "SUSPENDED"].map((value) => <option key={value}>{value}</option>)}</select>
    <Input name="website" placeholder="https://example.com" className="lg:col-span-2" />
    <textarea name="description" rows={2} maxLength={2000} placeholder="Internal organization description" className="rounded-md border bg-background p-3 text-sm lg:col-span-2" />
    <div className="lg:col-span-4"><Button disabled={pending}>{pending ? "Creating..." : "Create organization"}</Button><Status message={state.message} error={state.status === "error"} /></div>
  </form>;
}

export function MemberForm({ organizations }: { organizations: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(upsertMemberAction, initial);
  return <form action={action} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_140px_140px_auto]">
    <select name="organization_id" className="h-10 rounded-md border bg-background px-3 text-sm">
      {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
    </select>
    <Input name="user_id" placeholder="Profile UUID" required />
    <select name="role" className="h-10 rounded-md border bg-background px-3 text-sm">{["ADMIN", "REVIEWER", "ISSUER", "VIEWER"].map((role) => <option key={role}>{role}</option>)}</select>
    <select name="status" className="h-10 rounded-md border bg-background px-3 text-sm">{["ACTIVE", "INVITED", "SUSPENDED"].map((status) => <option key={status}>{status}</option>)}</select>
    <Button disabled={pending}>Save</Button>
    <div className="md:col-span-5"><Status message={state.message} error={state.status === "error"} /></div>
  </form>;
}

export function RemoveMemberForm({ memberId }: { memberId: string }) {
  const [state, action, pending] = useActionState(removeMemberAction, initial);
  const [confirming, setConfirming] = useState(false);
  return <form action={action} className="flex items-center gap-2">
    <input type="hidden" name="member_id" value={memberId} />
    {!confirming ? <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>Remove</Button> : <Button size="sm" variant="outline" disabled={pending}>Confirm remove</Button>}
    <Status message={state.message} error={state.status === "error"} />
  </form>;
}

export function CredentialAdminForm({ credentialId, status }: { credentialId: string; status: string }) {
  const [state, action, pending] = useActionState(adminCredentialAction, initial);
  const [confirming, setConfirming] = useState(false);
  if (status !== "PENDING_REVIEW" && status !== "ISSUED") return null;
  const actionName = status === "PENDING_REVIEW" ? "issue" : "revoke";
  return <form action={action} className="flex flex-wrap items-center gap-2">
    <input type="hidden" name="credential_id" value={credentialId} />
    <input type="hidden" name="action" value={actionName} />
    {actionName === "revoke" && <Input name="reason" minLength={8} maxLength={1000} required placeholder="Revocation reason" className="min-w-56" />}
    {!confirming ? <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>{actionName === "issue" ? "Approve" : "Revoke"}</Button> : <Button size="sm" variant="outline" disabled={pending}>Confirm {actionName}</Button>}
    <Status message={state.message} error={state.status === "error"} />
  </form>;
}

export function BadgeMetadataForm({ badge }: { badge: { id: string; name: string; description: string | null; category: string; level: string | null; active: boolean } }) {
  const [state, action, pending] = useActionState(updateBadgeAction, initial);
  return <form action={action} className="grid gap-3">
    <input type="hidden" name="badge_id" value={badge.id} />
    <Input name="name" defaultValue={badge.name} required maxLength={160} />
    <textarea name="description" defaultValue={badge.description ?? ""} maxLength={2000} rows={3} className="w-full rounded-md border bg-background p-3 text-sm" placeholder="Description" />
    <div className="grid gap-3 sm:grid-cols-3">
      <select name="category" defaultValue={badge.category} className="h-10 rounded-md border bg-background px-3 text-sm">{["COURSE", "SECURITY", "CONTRIBUTION", "INTERNSHIP", "RECOGNITION"].map((category) => <option key={category}>{category}</option>)}</select>
      <Input name="level" defaultValue={badge.level ?? ""} maxLength={80} placeholder="Level" />
      <select name="active" defaultValue={String(badge.active)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="true">Active</option><option value="false">Inactive</option></select>
    </div>
    <div className="flex items-center gap-3"><Button size="sm" disabled={pending}>Update badge</Button><Status message={state.message} error={state.status === "error"} /></div>
  </form>;
}

export function PasswordResetLinkForm() {
  const [state, action, pending] = useActionState(generatePasswordResetLinkAction, initial);
  const success = state.status === "success" && state.message?.startsWith("http");
  return <form action={action} className="grid gap-3 rounded-xl border border-primary/20 bg-card p-5 sm:grid-cols-[1fr_auto]">
    <Input type="email" name="email" placeholder="account@example.com" required />
    <Button disabled={pending}>{pending ? "Generating..." : "Generate reset link"}</Button>
    <p className={`break-all text-xs ${state.status === "error" ? "text-destructive" : "text-primary"} sm:col-span-2`} role="status">{success ? state.message : state.message}</p>
  </form>;
}
