import { Skeleton } from "@medsync/ui";

export default function BlockchainLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
