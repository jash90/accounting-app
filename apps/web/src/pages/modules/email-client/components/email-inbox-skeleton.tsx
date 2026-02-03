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
        <Skeleton className="h-4 w-4 rounded bg-muted-foreground/20" />
      </div>

      {/* Email Content Skeleton */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {/* From name */}
            <Skeleton className="h-5 w-40 bg-muted-foreground/20" />
            {/* Subject */}
            <Skeleton className="h-4 w-3/4 bg-muted-foreground/20" />
            {/* Preview text */}
            <Skeleton className="h-4 w-full bg-muted-foreground/20" />
          </div>
          {/* Date */}
          <Skeleton className="ml-4 h-3 w-20 bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}
