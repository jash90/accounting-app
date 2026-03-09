import { Link, useLocation } from 'react-router-dom';

import {
  AlertTriangle,
  Archive,
  BotMessageSquare,
  FileText,
  Folder,
  Inbox,
  Send,
  ShoppingBag,
  Tag,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useEmailFolders, type MailboxInfo } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { cn } from '@/lib/utils/cn';

/**
 * Skeleton component for folder list loading state
 */
function EmailSidebarSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
          <Skeleton className="h-4 w-4 bg-muted-foreground/20" />
          <Skeleton className="h-4 w-20 bg-muted-foreground/20" />
        </div>
      ))}
    </div>
  );
}

// Map IMAP folder to appropriate icon — specialUse first, then name matching
function getFolderIcon(folder: MailboxInfo): LucideIcon {
  // Check specialUse (RFC 6154) first
  if (folder.specialUse) {
    switch (folder.specialUse) {
      case '\\Sent':
        return Send;
      case '\\Drafts':
        return FileText;
      case '\\Trash':
        return Trash2;
      case '\\Junk':
        return AlertTriangle;
      case '\\Archive':
        return Archive;
      case '\\Inbox':
        return Inbox;
    }
  }

  // Fallback: name matching
  const lower = folder.path.toLowerCase();

  if (lower === 'inbox') return Inbox;
  if (lower.includes('sent') || lower.includes('wysłane') || lower.includes('wyslane')) return Send;
  if (lower.includes('draft') || lower.includes('robocz')) return FileText;
  if (lower.includes('trash') || lower.includes('kosz') || lower.includes('deleted')) return Trash2;
  if (
    lower.includes('spam') ||
    lower.includes('śmieci') ||
    lower.includes('smieci') ||
    lower.includes('junk')
  )
    return AlertTriangle;
  if (lower.includes('archive') || lower.includes('archiwum')) return Archive;
  if (lower.includes('społeczności') || lower.includes('spolecznosci') || lower.includes('social'))
    return Users;
  if (lower.includes('oferty') || lower.includes('promotions') || lower.includes('promo'))
    return ShoppingBag;
  if (lower.includes('kategori') || lower.includes('label')) return Tag;

  return Folder;
}

// Get display label for folder
function getFolderLabel(folder: MailboxInfo): string {
  if (folder.path === 'INBOX') return 'Odebrane';
  return folder.path;
}

// Sort folders with INBOX first, then alphabetically
function sortFolders(folders: MailboxInfo[]): MailboxInfo[] {
  return [...folders].sort((a, b) => {
    if (a.path === 'INBOX') return -1;
    if (b.path === 'INBOX') return 1;
    return a.path.localeCompare(b.path, 'pl');
  });
}

export function EmailSidebar() {
  const location = useLocation();
  const emailNav = useEmailClientNavigation();
  const { data: folders, isPending, isFetching, isError } = useEmailFolders();

  const isActive = (folderPath: string) => {
    const encodedFolder = encodeURIComponent(folderPath);
    return location.pathname.includes(`/email-client/folder/${encodedFolder}`);
  };

  const showSkeleton = isPending || (isFetching && !folders) || isError || !folders;

  if (showSkeleton) {
    return (
      <aside className="bg-muted/30 w-48 flex-shrink-0 border-r">
        <EmailSidebarSkeleton />
      </aside>
    );
  }

  const sortedFolders = sortFolders(folders);

  const autoReplyHref = `${emailNav.basePath}/auto-reply-templates`;
  const autoReplyActive = location.pathname.includes('/auto-reply-templates');

  return (
    <aside className="bg-muted/30 flex w-48 flex-shrink-0 flex-col border-r">
      <nav className="flex-1 space-y-1 p-2">
        {sortedFolders.map((folder) => {
          const Icon = getFolderIcon(folder);
          const active = isActive(folder.path);
          const href = `${emailNav.basePath}/folder/${encodeURIComponent(folder.path)}`;

          return (
            <Link
              key={folder.path}
              to={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {getFolderLabel(folder)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <Link
          to={autoReplyHref}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            autoReplyActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <BotMessageSquare className="h-4 w-4" />
          Auto-odpowiedzi
        </Link>
      </div>
    </aside>
  );
}
