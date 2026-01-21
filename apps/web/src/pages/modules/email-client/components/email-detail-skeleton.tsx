import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function EmailDetailSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded bg-gray-200" />
          <Skeleton className="h-6 w-64 bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded bg-gray-200" />
          <Skeleton className="h-8 w-24 rounded bg-gray-200" />
          <Skeleton className="h-8 w-20 rounded bg-gray-200" />
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-auto p-6">
        <div>
          {/* Email Headers */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-4 w-16 bg-gray-200" />
              <Skeleton className="h-4 w-48 bg-gray-200" />
            </div>
            <div className="flex items-start gap-4">
              <Skeleton className="h-4 w-16 bg-gray-200" />
              <Skeleton className="h-4 w-40 bg-gray-200" />
            </div>
            <div className="flex items-start gap-4">
              <Skeleton className="h-4 w-16 bg-gray-200" />
              <Skeleton className="h-4 w-32 bg-gray-200" />
            </div>
            <div className="flex items-start gap-4">
              <Skeleton className="h-4 w-16 bg-gray-200" />
              <Skeleton className="h-4 w-56 bg-gray-200" />
            </div>
          </div>

          <Separator className="my-4" />

          {/* Email Body */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-3/4 bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-5/6 bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-2/3 bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
