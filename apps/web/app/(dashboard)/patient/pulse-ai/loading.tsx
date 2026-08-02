import { Skeleton } from "@medsync/ui";

export default function PulseAILoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-20 w-3/4 rounded-xl" />
        </div>
        <div className="flex gap-3 justify-end">
          <Skeleton className="h-16 w-2/3 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-24 w-3/4 rounded-xl" />
        </div>
      </div>
      <div className="p-4 border-t border-border">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
