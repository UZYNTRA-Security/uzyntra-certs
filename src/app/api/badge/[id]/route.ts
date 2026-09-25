import { createAdminClient } from "@/lib/supabase/admin";
export const runtime="nodejs";
const headers={"Cache-Control":"public, max-age=3600, stale-while-revalidate=86400","X-Content-Type-Options":"nosniff"};
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const id=(await params).id;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404,headers});
  try{const admin=createAdminClient();const badge=await admin.from("badges").select("id").eq("id",id).eq("icon_url",`/api/badge/${id}`).maybeSingle();if(badge.error||!badge.data)return new Response(null,{status:404,headers});const file=await admin.storage.from("badge-artwork").download(`${id}.webp`);if(file.error||!file.data)return new Response(null,{status:404,headers});return new Response(await file.data.arrayBuffer(),{headers:{...headers,"Content-Type":"image/webp"}});}catch{return new Response(null,{status:503,headers});}
}
