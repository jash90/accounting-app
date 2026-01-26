import { Link, useLocation } from 'react-router-dom';

import { FileText, Folder, Inbox, Loader2, PenSquare, Send, Trash2 } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useFolders } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { cn } from '@/lib/utils/cn';

// Map IMAP folder names to appropriate icons
function getFolderIcon(folderName: string) {
  const lower = folderName.toLowerCase();
  if (lower === 'inbox') return Inbox;
  if (lower.includes('sent') || lower.includes('wysłane') || lower.includes('wyslane')) return Send;
  if (lower.includes('draft') || lower.includes('robocz')) return FileText;
  if (lower.includes('trash') || lower.includes('kosz') || lower.includes('deleted')) return Trash2;
  return Folder;
}

// Get short label for mobile display
function getShortLabel(folderName: string): string {
  const lower = folderName.toLowerCase();
  if (lower === 'inbox') return 'Odebrane';
  if (lower.includes('sent') || lower.includes('wysłane')) return 'Wysłane';
  if (lower.includes('draft') || lower.includes('robocz')) return 'Robocze';
  if (lower.includes('trash') || lower.includes('kosz')) return 'Kosz';
  return folderName.length > 8 ? folderName.substring(0, 6) + '...' : folderName;
}

export function MobileEmailTabs() {
  const location = useLocation();
  const emailNav = useEmailClientNavigation();
  const { data: folders, isLoading } = useFolders();

  const isActive = (folderName: string) => {
    const encodedFolder = encodeURIComponent(folderName);
    return location.pathname.includes(`/email-client/folder/${encodedFolder}`);
  };

  // Default folders for quick access tabs
  const quickFolders = ['INBOX', 'Sent', 'Drafts', 'Trash'];
  const visibleFolders = folders
    ? quickFolders.filter((f) => folders.some((folder) => folder.toLowerCase() === f.toLowerCase()))
    : [];

  // Get all folders that don't match quick folders for the "More" drawer
  const otherFolders = folders
    ? folders.filter((f) => !quickFolders.some((qf) => f.toLowerCase() === qf.toLowerCase()))
    : [];

  if (isLoading) {
    return (
      <nav className="bg-background fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-center border-t md:hidden">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </nav>
    );
  }

  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t md:hidden">
      {/* Quick folder tabs */}
      {visibleFolders.map((folderName) => {
        const actualFolder = folders?.find((f) => f.toLowerCase() === folderName.toLowerCase());
        if (!actualFolder) return null;

        const Icon = getFolderIcon(actualFolder);
        const active = isActive(actualFolder);
        const href = `${emailNav.basePath}/folder/${encodeURIComponent(actualFolder)}`;

        return (
          <Link
            key={actualFolder}
            to={href}
            className={cn(
              'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{getShortLabel(actualFolder)}</span>
          </Link>
        );
      })}

      {/* More folders button (if there are additional folders) */}
      {otherFolders.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors"
            >
              <Folder className="h-5 w-5" />
              <span>Więcej</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[60vh]">
            <SheetHeader>
              <SheetTitle>Foldery</SheetTitle>
            </SheetHeader>
            <nav className="mt-4 space-y-1">
              {otherFolders.map((folderName) => {
                const Icon = getFolderIcon(folderName);
                const active = isActive(folderName);
                const href = `${emailNav.basePath}/folder/${encodeURIComponent(folderName)}`;

                return (
                  <Link
                    key={folderName}
                    to={href}
                    className={cn(
                      'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {folderName}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      )}

      {/* Compose button */}
      <Link
        to={emailNav.getComposePath()}
        className="text-primary-foreground bg-primary flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors"
      >
        <PenSquare className="h-5 w-5" />
        <span>Napisz</span>
      </Link>
    </nav>
  );
}
