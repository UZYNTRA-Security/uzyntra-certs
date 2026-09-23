import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="mx-auto max-w-6xl space-y-5 px-6 py-20">
    <p className="font-mono text-sm text-primary">404</p><h1 className="text-3xl font-semibold">Page not found</h1>
    <p className="text-muted-foreground">This page doesn’t exist or has moved.</p>
    <Button asChild><Link href="/">Return home</Link></Button>
  </div>;
}
