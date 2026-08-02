import { Skeleton } from "@medsync/ui";

export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-64 border-r border-border bg-card p-4 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
