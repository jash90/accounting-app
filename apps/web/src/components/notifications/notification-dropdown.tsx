import { Link } from 'react-router-dom';

import { Bell, Check } from 'lucide-react';

import { NotificationItem } from '@/components/notifications/notification-item';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useArchiveNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/lib/hooks/use-notifications';

interface NotificationDropdownProps {
  children: React.ReactNode;
}

export function NotificationDropdown({ children }: NotificationDropdownProps) {
  const { data: notificationsData, isLoading } = useNotifications({
    isRead: false,
    limit: 5,
    page: 1,
  });

  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();
  const { mutate: archive } = useArchiveNotification();

  const notifications = notificationsData?.data || [];
  const hasNotifications = notifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="notification-dropdown" className="w-80 sm:w-96">
        <div className="flex items-center justify-between px-4 py-2">
          <DropdownMenuLabel className="px-0">Powiadomienia</DropdownMenuLabel>
          {hasNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAll}
            >
              <Check className="mr-1 h-3 w-3" />
              Oznacz wszystkie
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[calc(100vh-300px)] max-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2 text-sm text-muted-foreground">Ładowanie powiadomień...</p>
            </div>
          ) : hasNotifications ? (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={(id) => markAsRead(id)}
                  onArchive={(id) => archive(id)}
                  showActions={false}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">Brak nowych powiadomień</p>
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" className="w-full justify-center text-sm" asChild>
            <Link to="/notifications">Zobacz wszystkie</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
