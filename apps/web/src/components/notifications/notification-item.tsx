import { Link } from 'react-router-dom';

import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Archive, Bell, Check, Clock, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { type NotificationResponseDto } from '@/types/notifications';

/**
 * Sanitize text content to prevent XSS attacks.
 * Escapes HTML entities in user-provided content.
 */
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate actionUrl to prevent XSS via javascript: protocol.
 * Only allows relative paths starting with / or # (internal navigation).
 */
function isValidActionUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  // Only allow relative paths starting with / or hash navigation
  // Reject javascript:, data:, vbscript:, and other potentially dangerous protocols
  return /^(\/[^/]|#)/.test(url) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(url);
}

interface NotificationItemProps {
  notification: NotificationResponseDto;
  onMarkAsRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  showActions?: boolean;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
  showActions = true,
}: NotificationItemProps) {
  const { id, title, message, actor, createdAt, isRead, actionUrl, isBatch, itemCount } =
    notification;

  const timeAgo = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: pl,
  });

  const content = (
    <div
      className={cn(
        'relative flex w-full items-start gap-4 p-4 transition-colors hover:bg-muted/50',
        !isRead && 'bg-muted/10'
      )}
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {actor ? <User className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-none font-medium',
              !isRead && 'font-semibold text-foreground',
              isRead && 'text-muted-foreground'
            )}
          >
            {sanitizeText(title)}
            {isBatch && itemCount > 1 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {itemCount} elementów
              </span>
            )}
          </p>
          <span className="flex shrink-0 items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {message && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{sanitizeText(message)}</p>
        )}

        {actor && (
          <p className="text-xs text-muted-foreground">
            {sanitizeText(actor.firstName)} {sanitizeText(actor.lastName)}
          </p>
        )}
      </div>

      {!isRead && <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />}
    </div>
  );

  const safeActionUrl = isValidActionUrl(actionUrl) ? actionUrl : null;

  return (
    <div className="group relative border-b last:border-0" data-testid="notification-item">
      {safeActionUrl ? (
        <Link to={safeActionUrl} className="block w-full text-left">
          {content}
        </Link>
      ) : (
        <div className="block w-full text-left">{content}</div>
      )}

      {showActions && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md shadow-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Opcje</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M3.625 7.5C3.625 8.05228 3.17728 8.5 2.625 8.5C2.07272 8.5 1.625 8.05228 1.625 7.5C1.625 6.94772 2.07272 6.5 2.625 6.5C3.17728 6.5 3.625 6.94772 3.625 7.5ZM8.625 7.5C8.625 8.05228 8.17728 8.5 7.625 8.5C7.07272 8.5 6.625 8.05228 6.625 7.5C6.625 6.94772 7.07272 6.5 7.625 6.5C8.17728 6.5 8.625 6.94772 8.625 7.5ZM13.625 7.5C13.625 8.05228 13.1773 8.5 12.625 8.5C12.0727 8.5 11.625 8.05228 11.625 7.5C11.625 6.94772 12.0727 6.5 12.625 6.5C13.1773 6.5 13.625 6.94772 13.625 7.5Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onMarkAsRead && !isRead && (
                <DropdownMenuItem onClick={() => onMarkAsRead(id)}>
                  <Check className="mr-2 h-4 w-4" />
                  Oznacz jako przeczytane
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={() => onArchive(id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Zarchiwizuj
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
