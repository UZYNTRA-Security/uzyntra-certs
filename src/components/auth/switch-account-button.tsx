"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SwitchAccountButton() {
  const router = useRouter();
  async function switchAccount() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return <Button type="button" size="sm" variant="outline" onClick={switchAccount}>Switch account</Button>;
}
