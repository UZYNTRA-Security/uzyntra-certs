import {getIssuerDashboard} from "@/lib/issuer/data";
import {requireIssuer} from "@/lib/issuer/guards";
import {CredentialForm} from "@/components/issuer/credential-form";
import {pageMetadata} from "@/lib/metadata";
export const metadata=pageMetadata("Create credential","Create an organization credential draft.","/issuer/create",false);
export default async function CreatePage(){await requireIssuer();const{badges,organization}=await getIssuerDashboard();return <section className="space-y-5"><div><h2 className="text-2xl font-semibold">Create credential</h2><p className="mt-2 text-sm text-muted-foreground">Creating for {organization.name}. Draft first, submit for review, then publish after approval.</p></div><CredentialForm badges={badges}/></section>}
