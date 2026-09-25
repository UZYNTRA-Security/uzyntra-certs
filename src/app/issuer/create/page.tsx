import {getIssuerDashboard} from "@/lib/issuer/data";
import {CredentialForm} from "@/components/issuer/credential-form";
import {pageMetadata} from "@/lib/metadata";
export const metadata=pageMetadata("Create credential","Create an issuer-controlled credential draft.","/issuer/create",false);
export default async function CreatePage(){const{badges}=await getIssuerDashboard();return <section className="space-y-5"><div><h2 className="text-2xl font-semibold">Create credential</h2><p className="mt-2 text-sm text-muted-foreground">Draft first, submit for review, then publish after approval. IDs are generated securely.</p></div><CredentialForm badges={badges}/></section>}
