"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireIssuer } from "./guards";
import { badgeInputSchema, credentialInputSchema, revokeSchema, type IssuerState } from "./schema";
import { ownedDraft } from "@/lib/candidate/avatar";
import { optimizeAvatar } from "@/lib/candidate/image";

const errorState = (message="Unable to complete this action. Please try again."): IssuerState => ({status:"error",message});
const refresh=()=>{revalidatePath("/issuer","layout");revalidatePath("/dashboard","layout");revalidatePath("/profile/[username]","page");};
export async function createCredentialAction(_state:IssuerState,form:FormData):Promise<IssuerState>{
  try{
    const {user}=await requireIssuer(); const parsed=credentialInputSchema.safeParse(Object.fromEntries(form)); if(!parsed.success)return errorState(parsed.error.issues[0].message);
    const admin=createAdminClient(); const candidate=await admin.rpc("find_candidate_for_issuance",{candidate_email:parsed.data.recipient_email});
    if(candidate.error||!candidate.data||typeof candidate.data!=="object"||!("id" in candidate.data)||!("full_name" in candidate.data))return errorState("No verified candidate account was found for that email.");
    const recipient=candidate.data as {id:string;full_name:string}; if(!recipient.full_name.trim())return errorState("The candidate must complete their full name before assignment.");
    const created=await admin.rpc("create_credential_draft",{actor_user:user.id,recipient_user:recipient.id,new_type:parsed.data.credential_type,new_category:parsed.data.category,new_title:parsed.data.title,new_description:parsed.data.description,new_issue_date:parsed.data.issue_date,new_expiry_date:parsed.data.expiry_date,new_badge:parsed.data.badge_id});
    if(created.error||!created.data||typeof created.data!=="object"||!("credential_id" in created.data))return errorState("The credential draft could not be created.");
    refresh();return{status:"success",message:"Credential draft created.",credentialId:String(created.data.credential_id)};
  }catch{return errorState();}
}
export async function transitionCredentialAction(id:string,action:"submit"|"issue"):Promise<IssuerState>{
  try{const required=action==="issue"?["REVIEWER","ADMIN"] as const:undefined;const {user}=await requireIssuer(required?[...required]:undefined);const changed=await createAdminClient().rpc("transition_credential",{actor_user:user.id,target_credential:id,requested_action:action,reason:null});if(changed.error)return errorState(action==="issue"?"The credential could not be issued. Check its review state, candidate name and issue date.":"Only a draft can be submitted.");refresh();return{status:"success",message:action==="submit"?"Credential submitted for review.":"Credential issued and published."};
  }catch{return errorState("You do not have permission for this action.");}
}
export async function revokeCredentialAction(_state:IssuerState,form:FormData):Promise<IssuerState>{
  try{const {user}=await requireIssuer(["REVIEWER","ADMIN"]);const parsed=revokeSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return errorState(parsed.error.issues[0].message);const changed=await createAdminClient().rpc("transition_credential",{actor_user:user.id,target_credential:parsed.data.credential_id,requested_action:"revoke",reason:parsed.data.reason});if(changed.error)return errorState("Only an issued credential can be revoked.");refresh();return{status:"success",message:"Credential revoked. Its public verification page now shows the revoked state."};
  }catch{return errorState("You do not have permission to revoke credentials.");}
}
export async function uploadBadgeAction(input:unknown):Promise<IssuerState>{
  try{const {user}=await requireIssuer();const parsed=badgeInputSchema.safeParse(input);if(!parsed.success)return errorState(parsed.error.issues[0].message);const path=ownedDraft(user.id,parsed.data.draft_path);const client=(await import("@/lib/supabase/server")).createClient;const bucket=(await client("write")).storage.from("badge-artwork");try{const downloaded=await bucket.download(path);if(downloaded.error||!downloaded.data)return errorState();const optimized=await optimizeAvatar(new Uint8Array(await downloaded.data.arrayBuffer()),downloaded.data.type);const admin=createAdminClient();const id=crypto.randomUUID();const objectPath=`${id}.webp`;const up=await admin.storage.from("badge-artwork").upload(objectPath,optimized,{contentType:"image/webp",upsert:false,cacheControl:"3600"});if(up.error)return errorState();const saved=await admin.from("badges").insert({id,name:parsed.data.name,slug:parsed.data.slug,category:parsed.data.category,level:parsed.data.level,icon_url:`/api/badge/${id}`}).select("id").single();if(saved.error){await admin.storage.from("badge-artwork").remove([objectPath]);return errorState(saved.error.code==="23505"?"That badge slug already exists.":undefined);}refresh();return{status:"success",message:"Badge uploaded and added to the catalog."};}finally{await bucket.remove([path]);}}
  catch{return errorState();}
}
