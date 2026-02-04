import { Skeleton } from "@/components/ui/skeleton";

export const CommentSkeleton = ({ isReply = false }: { isReply?: boolean }) => {
  return (
    <div className={isReply ? "ml-8 mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4" : ""}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isReply && (
                  <>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </>
                )}
                {!isReply && <Skeleton className="h-4 w-32" />}
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CommentSkeletonList = ({ count = 3, includeReplies = false }: { count?: number; includeReplies?: boolean }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <CommentSkeleton />
          {includeReplies && index < 2 && (
            <div className="mt-3">
              <CommentSkeleton isReply />
              <CommentSkeleton isReply />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
