import Image from "next/image";
import {getIssuerDashboard} from "@/lib/issuer/data";
import {requireIssuerPage} from "@/lib/issuer/guards";
import {BadgeUpload} from "@/components/issuer/badge-upload";
import {pageMetadata} from "@/lib/metadata";
export const metadata=pageMetadata("Issuer badges","Manage approved badge artwork.","/issuer/badges",false);
export default async function BadgesPage(){const[{badges},{user}]=await Promise.all([getIssuerDashboard(),requireIssuerPage()]);return <section className="space-y-8"><div><h2 className="text-2xl font-semibold">Badge catalog</h2><p className="mt-2 text-sm text-muted-foreground">Upload validated artwork for future credential assignment.</p></div><BadgeUpload userId={user.id}/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{badges.map(b=><div key={b.id} className="rounded-xl border bg-card p-4"><Image src={b.icon_url} width={96} height={96} alt="" className="mx-auto size-24 object-contain"/><h3 className="mt-3 font-medium">{b.name}</h3><p className="text-xs text-muted-foreground">{b.category} · {b.level||"Recognition"}</p></div>)}</div></section>}
