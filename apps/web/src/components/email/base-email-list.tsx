import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import {
  AlertCircle,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  useDeleteEmails,
  useEmailFolders,
  useMarkEmailsAsRead,
  useMoveEmails,
  useSearchEmails,
  useUpdateEmailFlags,
} from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { formatDate } from '@/lib/utils/format-date';

import { EmailListSkeleton } from '../../pages/modules/email-client/components/email-inbox-skeleton';
import { EmailSidebar } from '../../pages/modules/email-client/components/email-sidebar';

interface EmailAddress {
  name?: string;
  address?: string;
}

interface Email {
  uid: number;
  from: EmailAddress[];
  to?: EmailAddress[];
  subject: string;
  text?: string;
  date: string | Date;
  flags: string[];
}

interface BaseEmailListProps {
  title: string;
  emails: Email[] | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => void;
  emptyMessage: string;
  error?: Error | null;
  currentMailbox?: string;
  showMoveAction?: boolean;
}

function getErrorMessage(error: Error): string {
  const axiosError = error as Error & {
    response?: { data?: { message?: string } };
  };
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }
  return error.message || 'Nieznany błąd';
}

function isEmailConfigError(errorMessage: string): boolean {
  return (
    errorMessage.includes('konfiguracji email') ||
    errorMessage.includes('email configuration') ||
    errorMessage.includes('Email configuration') ||
    errorMessage.includes('Skonfiguruj')
  );
}

function EmailConfigModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-0 right-0 top-16 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      style={{ left: '256px' }}
    >
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center justify-center text-center">
          <Settings className="mx-auto mb-4 h-12 w-12 text-amber-500 opacity-70" />
          <h2 className="mb-2 text-xl font-semibold">Konfiguracja email wymagana</h2>
          <p className="text-muted-foreground mx-auto mb-6 max-w-md text-sm">
            Aby korzystać z modułu email, najpierw skonfiguruj konto pocztowe firmy w ustawieniach.
            Podaj dane serwera IMAP/SMTP oraz dane logowania.
          </p>
          <Link to="/settings/email-config">
            <Button variant="default" className="gap-2">
              <Settings className="h-4 w-4" />
              Przejdź do ustawień email
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmailErrorState({ error, refetch }: { error: Error; refetch: () => void }) {
  const errorMessage = getErrorMessage(error);

  return (
    <div className="p-8 text-center">
      <AlertCircle className="text-destructive mx-auto mb-4 h-12 w-12 opacity-70" />
      <h3 className="mb-2 text-lg font-semibold">Wystąpił błąd</h3>
      <p className="text-muted-foreground mb-4">{errorMessage}</p>
      <Button variant="outline" onClick={() => refetch()} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}

export function BaseEmailList({
  title,
  emails,
  isLoading,
  isRefetching,
  refetch,
  emptyMessage,
  error,
  currentMailbox = 'INBOX',
  showMoveAction = true,
}: BaseEmailListProps) {
  'use no memo';
  const markAsRead = useMarkEmailsAsRead();
  const deleteEmails = useDeleteEmails();
  const updateFlags = useUpdateEmailFlags();
  const moveMessages = useMoveEmails();
  const { data: folders } = useEmailFolders();
  const { toast } = useToast();
  const emailNav = useEmailClientNavigation();

  // Selection state
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(deferredSearch), 300);
    return () => clearTimeout(timer);
  }, [deferredSearch]);

  const { data: searchResults, isLoading: isSearching } = useSearchEmails(
    debouncedQuery,
    currentMailbox
  );

  const isSearchActive = debouncedQuery.length >= 2;

  // Check if error is a config error
  const errorMessage = error ? getErrorMessage(error) : '';
  const isConfigError = error ? isEmailConfigError(errorMessage) : false;

  // Use search results or regular emails
  const displayEmails = useMemo(() => {
    if (isSearchActive && searchResults) {
      return searchResults.messages;
    }
    return emails || [];
  }, [isSearchActive, searchResults, emails]);

  // Sort emails by date (newest first) and paginate
  const sortedEmails = useMemo(() => {
    return [...displayEmails].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [displayEmails]);

  const totalPages = Math.ceil(sortedEmails.length / pageSize);
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmails.slice(start, start + pageSize);
  }, [sortedEmails, currentPage]);

  // Compute selection state
  const allSelected = useMemo(() => {
    if (sortedEmails.length === 0) return false;
    return sortedEmails.every((email) => selectedUids.has(email.uid));
  }, [sortedEmails, selectedUids]);

  const someSelected = selectedUids.size > 0;

  const unreadSelectedCount = sortedEmails.filter(
    (email) => selectedUids.has(email.uid) && !email.flags.includes('\\Seen')
  ).length;

  // Selection handlers
  const toggleSelectAll = () => {
    if (sortedEmails.length === 0) return;
    if (allSelected) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(sortedEmails.map((e) => e.uid)));
    }
  };

  const toggleSelect = (uid: number, event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const newSelected = new Set(selectedUids);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedUids(newSelected);
  };

  // Star toggle
  const handleToggleStar = async (uid: number, isStarred: boolean, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const addFlags = isStarred ? undefined : ['\\Flagged'];
    const removeFlags = isStarred ? ['\\Flagged'] : undefined;
    try {
      await updateFlags.mutateAsync({
        uid,
        add: addFlags,
        remove: removeFlags,
        mailbox: currentMailbox,
      });
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować flagi',
        variant: 'destructive',
      });
    }
  };

  // Bulk actions
  const handleMarkAsRead = async () => {
    if (selectedUids.size === 0) return;
    try {
      await markAsRead.mutateAsync(Array.from(selectedUids));
      toast({
        title: 'Sukces',
        description: `Oznaczono ${selectedUids.size} wiadomości jako przeczytane`,
      });
      setSelectedUids(new Set());
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się oznaczyć wiadomości jako przeczytane',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (selectedUids.size === 0) return;
    try {
      await deleteEmails.mutateAsync(Array.from(selectedUids));
      toast({ title: 'Sukces', description: `Usunięto ${selectedUids.size} wiadomości` });
      setSelectedUids(new Set());
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć wiadomości',
        variant: 'destructive',
      });
    }
  };

  const handleMoveSelected = async (destinationMailbox: string) => {
    if (selectedUids.size === 0) return;
    try {
      await moveMessages.mutateAsync({
        uids: Array.from(selectedUids),
        sourceMailbox: currentMailbox,
        destinationMailbox,
      });
      toast({
        title: 'Sukces',
        description: `Przeniesiono ${selectedUids.size} wiadomości do ${destinationMailbox}`,
      });
      setSelectedUids(new Set());
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się przenieść wiadomości',
        variant: 'destructive',
      });
    }
  };

  const clearSelection = () => setSelectedUids(new Set());

  const handleRefresh = () => {
    setCurrentPage(1);
    refetch();
  };

  const isProcessing = markAsRead.isPending || deleteEmails.isPending || moveMessages.isPending;

  // Available folders for move (excluding current)
  const availableFolders = useMemo(
    () => (folders || []).filter((f) => f.path !== currentMailbox),
    [folders, currentMailbox]
  );

  return (
    <div className="flex h-full">
      <EmailSidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <EmailConfigModal isOpen={isConfigError} />

        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground text-sm">
              {isSearchActive
                ? `${searchResults?.total || 0} wyników`
                : `${emails?.length || 0} wiadomości`}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Search bar */}
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="Szukaj..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 pl-8 text-sm"
              />
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefetching}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Link to={emailNav.getComposePath()}>
              <Button size="sm" className="gap-2">
                <Mail className="h-4 w-4" />
                Napisz
              </Button>
            </Link>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {someSelected && (
          <div className="bg-muted/50 flex h-12 items-center gap-4 border-b px-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-sm font-medium">{selectedUids.size} zaznaczono</span>
            </div>
            <div className="flex gap-2">
              {unreadSelectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isProcessing}
                >
                  {markAsRead.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="mr-2 h-4 w-4" />
                  )}
                  Oznacz jako przeczytane
                </Button>
              )}
              {showMoveAction && availableFolders.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isProcessing}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Przenieś do...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {availableFolders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.path}
                        onClick={() => handleMoveSelected(folder.path)}
                      >
                        {folder.path}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
              >
                {deleteEmails.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Usuń
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isProcessing}>
                Wyczyść zaznaczenie
              </Button>
            </div>
          </div>
        )}

        {/* Select All Row (when no selection) */}
        {!someSelected && sortedEmails.length > 0 && (
          <div className="bg-muted/30 flex h-12 items-center gap-2 border-b px-4">
            <Checkbox checked={false} onCheckedChange={toggleSelectAll} aria-label="Select all" />
            <span className="text-muted-foreground text-sm">Zaznacz wszystkie</span>
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-auto">
          {isLoading || (isSearchActive && isSearching) ? (
            <EmailListSkeleton />
          ) : error && !isConfigError ? (
            <EmailErrorState error={error} refetch={refetch} />
          ) : sortedEmails.length === 0 && !isConfigError ? (
            <div className="text-muted-foreground p-8 text-center">
              <MailOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>{isSearchActive ? 'Brak wyników wyszukiwania' : emptyMessage}</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedEmails.map((email) => {
                const isSelected = selectedUids.has(email.uid);
                const isUnread = !email.flags.includes('\\Seen');
                const isStarred = email.flags.includes('\\Flagged');

                return (
                  <div
                    key={email.uid}
                    className={`hover:bg-muted/50 flex items-start gap-3 p-4 transition-colors ${
                      isSelected ? 'bg-muted/70' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer pt-1"
                      onClick={(e) => toggleSelect(email.uid, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSelect(email.uid, e);
                        }
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        aria-label={`Select email from ${email.from[0]?.name || email.from[0]?.address}`}
                      />
                    </div>

                    {/* Star */}
                    <button
                      type="button"
                      className="pt-1 focus:outline-none"
                      onClick={(e) => handleToggleStar(email.uid, isStarred, e)}
                      aria-label={isStarred ? 'Usuń gwiazdkę' : 'Dodaj gwiazdkę'}
                    >
                      <Star
                        className={`h-4 w-4 transition-colors ${
                          isStarred
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground hover:text-yellow-400'
                        }`}
                      />
                    </button>

                    {/* Email Content (clickable link) */}
                    <Link
                      to={emailNav.getMessagePath(email.uid)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`truncate ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                              {email.from[0]?.name || email.from[0]?.address}
                            </p>
                            {isUnread && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p
                            className={`mt-1 truncate text-sm ${
                              isUnread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {email.subject || '(Brak tematu)'}
                          </p>
                          <p className="text-muted-foreground mt-1 truncate text-sm">
                            {email.text?.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="text-muted-foreground ml-4 text-xs whitespace-nowrap">
                          {formatDate(email.date)}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
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
