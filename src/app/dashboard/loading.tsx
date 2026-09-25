import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div role="status" aria-label="Loading your dashboard" className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div><Skeleton className="h-64" /><span className="sr-only">Loading your dashboard...</span></div>;
}
