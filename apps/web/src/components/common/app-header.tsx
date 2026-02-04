import { type ReactNode } from 'react';

import { UserMenu } from '@/components/common/user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface AppHeaderProps {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function AppHeader({ leftContent, rightContent }: AppHeaderProps) {
  return (
    <header
      className="h-16 border-b border-header-border bg-header"
      role="banner"
      aria-label="Nagłówek aplikacji"
    >
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex-1">{leftContent ?? null}</div>
        <div className="flex items-center gap-3">
          {rightContent ?? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
