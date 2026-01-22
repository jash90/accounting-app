import { useState } from 'react';

import { Link } from 'react-router-dom';

import { AlertCircle, Archive, CheckCheck, Inbox, RefreshCw } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { NotificationItem } from '@/components/notifications/notification-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useArchiveNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/lib/hooks/use-notifications';

export default function NotificationsInboxPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isPending, isError, refetch } = useNotifications({
    page,
    limit: 20,
    isRead: filter === 'unread' ? false : undefined,
  });

  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: archive } = useArchiveNotification();

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const totalPages = data?.meta.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Powiadomienia"
        description="Zarządzaj swoimi powiadomieniami i bądź na bieżąco z aktywnością w systemie."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/notifications/archive">
                <Archive className="mr-2 h-4 w-4" />
                Archiwum
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/notifications/settings">Ustawienia</Link>
            </Button>
            <Button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || isPending || data?.data.length === 0}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Oznacz wszystkie jako przeczytane
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="p-0 border-b">
          <div className="px-6 py-4">
            <Tabs
              defaultValue="all"
              value={filter}
              onValueChange={(v) => {
                setFilter(v as 'all' | 'unread');
                setPage(1);
              }}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="all">Wszystkie</TabsTrigger>
                <TabsTrigger value="unread">Nieprzeczytane</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
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
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="mb-4 rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-lg font-medium">Wystąpił błąd</p>
              <p className="text-sm mb-4">Nie udało się pobrać powiadomień.</p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Spróbuj ponownie
              </Button>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Inbox className="h-8 w-8" />
              </div>
              <p className="text-lg font-medium">Brak powiadomień</p>
              <p className="text-sm">Nie masz żadnych powiadomień w tej sekcji.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data?.data.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={(id) => markAsRead(id)}
                  onArchive={(id) => archive(id)}
                />
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
