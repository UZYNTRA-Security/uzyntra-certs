"use client";
import { Button } from "@/components/ui/button";
export default function DashboardError({ reset }: { reset: () => void }) {
  return <div role="alert" className="space-y-4 rounded-xl border border-border p-8"><h1 className="text-2xl font-semibold">Your account could not be loaded</h1><p className="text-muted-foreground">Please check your connection and try again.</p><Button onClick={reset}>Try again</Button></div>;
}
