import { Skeleton } from "@/components/ui/skeleton";
export default function LoadingCredential() { return <div className="mx-auto max-w-3xl space-y-6 px-6 py-20" role="status"><p>Checking credential status…</p><Skeleton className="h-12 w-64" /><Skeleton className="h-72 w-full" /></div>; }
