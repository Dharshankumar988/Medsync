import { Skeleton } from "@medsync/ui";

export default function RootLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
