import { Skeleton } from "@/components/ui/skeleton";

export const NotificationSkeleton = () => (
  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div className="flex gap-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  </div>
);

export const NotificationSkeletonList = ({ count = 5 }: { count?: number }) => (
  <div className="py-4 space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <NotificationSkeleton key={i} />
    ))}
  </div>
);
