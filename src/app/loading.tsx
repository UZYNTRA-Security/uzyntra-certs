import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div role="status" className="mx-auto max-w-6xl space-y-6 px-6 py-20">
    <span className="sr-only">Loading, please wait.</span>
    <Skeleton className="h-4 w-48" /><Skeleton className="h-16 w-full max-w-xl" /><Skeleton className="h-16 w-3/4 max-w-lg" /><Skeleton className="h-32 w-full max-w-3xl" />
  </div>;
}
