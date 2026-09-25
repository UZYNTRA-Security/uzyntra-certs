"use client";
import {useActionState} from "react";
import {createCredentialAction} from "@/lib/issuer/actions";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
const pairs=["COURSE_CERTIFICATE","INTERNSHIP","EMPLOYMENT","CONTRIBUTION","APPRECIATION","BUG_BOUNTY","ACHIEVEMENT"];
const categories=["COURSE","INTERNSHIP","EMPLOYMENT","CONTRIBUTION","APPRECIATION","BUG_BOUNTY","ACHIEVEMENT"];
export function CredentialForm({badges}:{badges:Array<{id:string;name:string}>}){const[state,action,pending]=useActionState(createCredentialAction,{status:"idle" as const});return <form action={action} className="grid gap-5 rounded-xl border bg-card p-6 sm:grid-cols-2">
  <label className="space-y-2 text-sm sm:col-span-2">Credential title *<Input name="title" required maxLength={240}/></label>
  <label className="space-y-2 text-sm">Type *<select name="credential_type" required className="mt-2 h-10 w-full rounded-md border bg-background px-3">{pairs.map(v=><option key={v}>{v}</option>)}</select></label>
  <label className="space-y-2 text-sm">Category *<select name="category" required className="mt-2 h-10 w-full rounded-md border bg-background px-3">{categories.map(v=><option key={v}>{v}</option>)}</select></label>
  <label className="space-y-2 text-sm sm:col-span-2">Recipient account email *<Input name="recipient_email" type="email" required autoComplete="off"/></label>
  <label className="space-y-2 text-sm">Issue date *<Input name="issue_date" type="date" required/></label><label className="space-y-2 text-sm">Expiry date<Input name="expiry_date" type="date"/></label>
  <label className="space-y-2 text-sm sm:col-span-2">Badge<select name="badge_id" className="mt-2 h-10 w-full rounded-md border bg-background px-3"><option value="">No badge</option>{badges.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
  <label className="space-y-2 text-sm sm:col-span-2">Description<textarea name="description" maxLength={5000} rows={5} className="mt-2 w-full rounded-md border bg-background p-3"/></label>
  <div className="sm:col-span-2"><p role="status" className={state.status==="error"?"text-sm text-destructive":"text-sm text-primary"}>{state.message}{state.credentialId&&` ID: ${state.credentialId}`}</p><Button className="mt-3" disabled={pending}>{pending?"Creating draft...":"Create credential draft"}</Button></div>
 </form>}
