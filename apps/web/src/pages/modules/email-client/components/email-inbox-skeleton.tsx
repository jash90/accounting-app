import { Skeleton } from '@/components/ui/skeleton';

export function EmailListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 8 }).map((_, index) => (
        <EmailRowSkeleton key={index} />
      ))}
    </div>
  );
}

function EmailRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4">
      {/* Checkbox Skeleton */}
      <div className="pt-1">
        <Skeleton className="h-4 w-4 rounded bg-gray-200" />
      </div>

      {/* Email Content Skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            {/* From name */}
            <Skeleton className="h-5 w-40 bg-gray-200" />
            {/* Subject */}
            <Skeleton className="h-4 w-3/4 bg-gray-200" />
            {/* Preview text */}
            <Skeleton className="h-4 w-full bg-gray-200" />
          </div>
          {/* Date */}
          <Skeleton className="h-3 w-20 ml-4 bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
