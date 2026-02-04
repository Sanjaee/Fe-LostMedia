import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const PostSkeleton = () => {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Post Content */}
        <div className="px-4 py-2 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Post Images */}
        <div className="mt-2">
          <Skeleton className="w-full h-96" />
        </div>
        
        {/* Stats */}
        <div className="px-4 py-2 flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        <Separator />

        {/* Actions */}
        <div className="flex items-center px-4 py-1 gap-0">
          <Skeleton className="flex-1 h-10 mx-2" />
          <Skeleton className="flex-1 h-10 mx-2" />
          <Skeleton className="flex-1 h-10 mx-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export const PostSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  );
};
