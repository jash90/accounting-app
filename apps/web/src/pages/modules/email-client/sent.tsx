import { useState, useMemo } from 'react';

import { Link } from 'react-router-dom';

import { RefreshCw, Send, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useFolder, useFolders } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';

import { EmailListSkeleton } from './components/email-inbox-skeleton';
import { EmailSidebar } from './components/email-sidebar';

// Helper to find the Sent folder name from available folders
function findSentFolder(folders: string[] | undefined): string {
  if (!folders) return 'Sent';

  const sentNames = [
    'Sent',
    'Sent Items',
    'Sent Mail',
    '[Gmail]/Sent Mail',
    'Wysłane',
    'INBOX.Sent',
    'INBOX/Sent',
  ];

  for (const name of sentNames) {
    const found = folders.find((f) => f.toLowerCase() === name.toLowerCase());
    if (found) return found;
  }

  // Partial match fallback
  const partial = folders.find(
    (f) => f.toLowerCase().includes('sent') || f.toLowerCase().includes('wysłan')
  );
  return partial || 'Sent';
}

export default function EmailSent() {
  const { data: folders } = useFolders();
  const sentFolder = findSentFolder(folders);
  const { data: emails, isLoading, refetch, isRefetching } = useFolder(sentFolder);
  const emailNav = useEmailClientNavigation();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sort emails by date (newest first) and paginate
  const sortedEmails = useMemo(() => {
    if (!emails) return [];
    return [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [emails]);

  const totalPages = Math.ceil(sortedEmails.length / pageSize);
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmails.slice(start, start + pageSize);
  }, [sortedEmails, currentPage]);

  return (
    <div className="flex h-full">
      <EmailSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h1 className="text-2xl font-bold">Wysłane</h1>
            <p className="text-muted-foreground text-sm">{emails?.length || 0} wiadomości</p>
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
            <div className="text-muted-foreground p-8 text-center">
              <Send className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Brak wysłanych wiadomości</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedEmails.map((email) => (
                <Link
                  key={email.uid}
                  to={emailNav.getMessagePath(email.uid)}
                  className="hover:bg-muted/50 block p-4 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        Do: {email.to[0]?.name || email.to[0]?.address}
                        {email.to.length > 1 && ` (+${email.to.length - 1})`}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium">
                        {email.subject || '(Brak tematu)'}
                      </p>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {email.text?.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="text-muted-foreground ml-4 text-xs whitespace-nowrap">
                      {new Date(email.date).toLocaleDateString('pl-PL')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {sortedEmails.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-sm">
              {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, sortedEmails.length)} z {sortedEmails.length}
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
