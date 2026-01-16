import { useState, useMemo } from 'react';
import { useFolder, useFolders } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmailListSkeleton } from './components/email-inbox-skeleton';
import { EmailSidebar } from './components/email-sidebar';

// Helper to find the Trash folder name from available folders
function findTrashFolder(folders: string[] | undefined): string {
  if (!folders) return 'Trash';

  const trashNames = [
    'Trash',
    'Deleted',
    'Deleted Items',
    'Deleted Messages',
    '[Gmail]/Trash',
    'Kosz',
    'INBOX.Trash',
    'INBOX/Trash',
  ];

  for (const name of trashNames) {
    const found = folders.find(f => f.toLowerCase() === name.toLowerCase());
    if (found) return found;
  }

  // Partial match fallback
  const partial = folders.find(f =>
    f.toLowerCase().includes('trash') ||
    f.toLowerCase().includes('deleted') ||
    f.toLowerCase().includes('kosz')
  );
  return partial || 'Trash';
}

export default function EmailTrash() {
  const { data: folders } = useFolders();
  const trashFolder = findTrashFolder(folders);
  const { data: emails, isLoading, refetch, isRefetching } = useFolder(trashFolder);
  const emailNav = useEmailClientNavigation();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sort emails by date (newest first) and paginate
  const sortedEmails = useMemo(() => {
    if (!emails) return [];
    return [...emails].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [emails]);

  const totalPages = Math.ceil(sortedEmails.length / pageSize);
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmails.slice(start, start + pageSize);
  }, [sortedEmails, currentPage]);

  return (
    <div className="h-full flex">
      <EmailSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kosz</h1>
            <p className="text-sm text-muted-foreground">
              {emails?.length || 0} wiadomości
            </p>
          </div>
          <Button
            onClick={() => {
              setCurrentPage(1);
              refetch();
            }}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <EmailListSkeleton />
          ) : sortedEmails.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Kosz jest pusty</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedEmails.map((email) => {
                const isUnread = !email.flags.includes('\\Seen');

                return (
                  <Link
                    key={email.uid}
                    to={emailNav.getMessagePath(email.uid)}
                    className="block p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`truncate ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                            {email.from[0]?.name || email.from[0]?.address}
                          </p>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                          {email.subject || '(Brak tematu)'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {email.text?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {new Date(email.date).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {sortedEmails.length > 0 && (
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, sortedEmails.length)} z{' '}
              {sortedEmails.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Poprzednia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="gap-1"
              >
                Następna
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
