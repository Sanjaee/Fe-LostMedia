import { Skeleton } from "@/components/ui/skeleton";

export const PeopleSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
    <div className="flex-1 space-y-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-8 w-24" />
  </div>
);

export const PeopleSkeletonList = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-2 md:space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <PeopleSkeleton key={i} />
    ))}
  </div>
);
