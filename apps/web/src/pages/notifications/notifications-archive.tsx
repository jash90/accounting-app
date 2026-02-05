import { useState } from 'react';

import { Link } from 'react-router-dom';

import { ArchiveRestore, ArrowLeft, Inbox } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { NotificationItem } from '@/components/notifications/notification-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useArchivedNotifications, useRestoreNotification } from '@/lib/hooks/use-notifications';

export default function NotificationsArchivePage() {
  const [page, setPage] = useState(1);

  const { data, isPending } = useArchivedNotifications({
    page,
    limit: 20,
  });

  const { mutate: restore } = useRestoreNotification();

  const totalPages = data?.meta.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archiwum powiadomień"
        description="Przeglądaj zarchiwizowane powiadomienia."
        action={
          <Button variant="outline" asChild>
            <Link to="/notifications">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do powiadomień
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="p-0 border-b"></CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Inbox className="h-8 w-8" />
              </div>
              <p className="text-lg font-medium">Brak zarchiwizowanych powiadomień</p>
              <p className="text-sm">Archiwum jest puste.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data?.data.map((notification) => (
                <div key={notification.id} className="relative group">
                  <NotificationItem notification={notification} showActions={false} />
                  <div className="absolute top-2 right-2 hidden group-hover:block bg-background/80 backdrop-blur-sm rounded-md shadow-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => restore(notification.id)}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            <span className="sr-only">Przywróć</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Przywróć powiadomienie</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Poprzednia
            </Button>
            <div className="text-sm font-medium">
              Strona {page} z {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Następna
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
