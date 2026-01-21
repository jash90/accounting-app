import { Link, useLocation } from 'react-router-dom';

import {
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertTriangle,
  Archive,
  Folder,
  Loader2,
  Tag,
  ShoppingBag,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useFolders } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { cn } from '@/lib/utils/cn';

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
  const { data: folders, isLoading } = useFolders();

  const isActive = (folderName: string) => {
    const encodedFolder = encodeURIComponent(folderName);
    return location.pathname.includes(`/email-client/folder/${encodedFolder}`);
  };

  if (isLoading) {
    return (
      <aside className="w-48 border-r bg-muted/30 flex-shrink-0">
        <nav className="p-2 space-y-1">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </nav>
      </aside>
    );
  }

  const sortedFolders = folders ? sortFolders(folders) : [];

  return (
    <aside className="w-48 border-r bg-muted/30 flex-shrink-0">
      <nav className="p-2 space-y-1">
        {sortedFolders.map((folderName) => {
          const Icon = getFolderIcon(folderName);
          const active = isActive(folderName);
          const href = `${emailNav.basePath}/folder/${encodeURIComponent(folderName)}`;

          return (
            <Link
              key={folderName}
              to={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
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
