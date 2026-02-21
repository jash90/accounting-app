import { Link, useLocation } from 'react-router-dom';

import {
  AlertTriangle,
  Archive,
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
import { useFolders } from '@/lib/hooks/use-email-client';
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

// Map IMAP folder names to appropriate icons
function getFolderIcon(folderName: string): LucideIcon {
  const lower = folderName.toLowerCase();

  // Standard folders
  if (lower === 'inbox') return Inbox;

  // Sent folder variants (English + Polish)
  if (lower.includes('sent') || lower.includes('wysłane') || lower.includes('wyslane')) return Send;

  // Drafts folder variants
  if (lower.includes('draft') || lower.includes('robocz')) return FileText;

  // Trash folder variants
  if (lower.includes('trash') || lower.includes('kosz') || lower.includes('deleted')) return Trash2;

  // Spam/Junk folder variants
  if (
    lower.includes('spam') ||
    lower.includes('śmieci') ||
    lower.includes('smieci') ||
    lower.includes('junk')
  )
    return AlertTriangle;

  // Archive folder variants
  if (lower.includes('archive') || lower.includes('archiwum')) return Archive;

  // Special folders (Polish email providers)
  if (lower.includes('społeczności') || lower.includes('spolecznosci') || lower.includes('social'))
    return Users;
  if (lower.includes('oferty') || lower.includes('promotions') || lower.includes('promo'))
    return ShoppingBag;
  if (lower.includes('kategori') || lower.includes('label')) return Tag;

  // Default folder icon
  return Folder;
}

// Get display label for folder (use original IMAP name)
function getFolderLabel(folderName: string): string {
  // Special case for INBOX - use Polish translation
  if (folderName === 'INBOX') return 'Odebrane';
  return folderName;
}

// Sort folders with INBOX first, then alphabetically
function sortFolders(folders: string[]): string[] {
  return [...folders].sort((a, b) => {
    if (a === 'INBOX') return -1;
    if (b === 'INBOX') return 1;
    return a.localeCompare(b, 'pl');
  });
}

export function EmailSidebar() {
  const location = useLocation();
  const emailNav = useEmailClientNavigation();
  const { data: folders, isPending, isFetching, isError } = useFolders();

  const isActive = (folderName: string) => {
    const encodedFolder = encodeURIComponent(folderName);
    return location.pathname.includes(`/email-client/folder/${encodedFolder}`);
  };

  // Show skeleton when:
  // 1. Initial loading (isPending) - no cached data
  // 2. Fetching with no data yet (isFetching && !folders)
  // 3. Error state (e.g., missing email config)
  // 4. No folders data available
  const showSkeleton = isPending || (isFetching && !folders) || isError || !folders;

  if (showSkeleton) {
    return (
      <aside className="bg-muted/30 w-48 flex-shrink-0 border-r">
        <EmailSidebarSkeleton />
      </aside>
    );
  }

  const sortedFolders = sortFolders(folders);

  return (
    <aside className="bg-muted/30 w-48 flex-shrink-0 border-r">
      <nav className="space-y-1 p-2">
        {sortedFolders.map((folderName) => {
          const Icon = getFolderIcon(folderName);
          const active = isActive(folderName);
          const href = `${emailNav.basePath}/folder/${encodeURIComponent(folderName)}`;

          return (
            <Link
              key={folderName}
              to={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {getFolderLabel(folderName)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
