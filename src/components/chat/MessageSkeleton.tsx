import { Skeleton } from "@/components/ui/skeleton";

export const MessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

export const MessageSkeletonList = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-4 py-4">
    {Array.from({ length: count }).map((_, i) => (
      <MessageSkeleton key={i} isOwn={i % 3 === 0} />
    ))}
  </div>
);
