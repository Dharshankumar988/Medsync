import { Skeleton } from "@medsync/ui";

export default function HospitalsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
