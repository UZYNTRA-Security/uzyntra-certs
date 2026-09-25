"use server";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {getIssuer} from "./guards";
export async function selectOrganizationAction(form:FormData){const slug=String(form.get("organization")||"");const access=await getIssuer();if(!access||!access.memberships.some(v=>v.organization.slug===slug))throw new Error("Organization access required.");(await cookies()).set("uzyntra-organization",slug,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:31536000});redirect("/issuer");}
