import { PageIntro } from "@/components/layout/page-intro";
import { VerificationSearch } from "@/components/verification/search-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("Verify a credential", "Check the status and issuer-approved details of a UZYNTRA Security credential. No login required.", "/verify", false);
export default function VerifyPage() {
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24"><PageIntro eyebrow="Public verification" title="Check the details. Confirm the recognition." description="Look up a published UZYNTRA Security credential by its unique ID. You do not need an account." />
    <Card className="mt-10 max-w-2xl"><CardHeader><CardTitle>Verify a credential</CardTitle></CardHeader><CardContent><VerificationSearch /></CardContent></Card>
    <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">{[["Verified","Issued and currently valid.","text-primary"],["Revoked","Withdrawn by the issuer.","text-destructive"],["Expired","Past its stated expiration date.","text-muted-foreground"]].map(([title,description,color])=><div key={title} className="rounded-xl border bg-card p-4"><h2 className={`font-semibold ${color}`}>{title}</h2><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>)}</div>
    <p className="mt-6 max-w-2xl text-sm text-muted-foreground">Only credentials approved for public verification appear here. A missing result does not prove that a document is fraudulent; contact its issuer if you need help.</p>
  </div>;
}
