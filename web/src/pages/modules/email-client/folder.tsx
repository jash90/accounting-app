import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFolder, useMarkAsRead, useDeleteEmails } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  RefreshCw,
  Mail,
  MailOpen,
  Trash2,
  CheckCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { EmailListSkeleton } from './components/email-inbox-skeleton';
import { EmailSidebar } from './components/email-sidebar';

// Get display name for folder title
function getFolderDisplayName(folderName: string): string {
  if (folderName === 'INBOX') return 'Odebrane';
  return folderName;
}

export default function EmailFolder() {
  const { folderName } = useParams<{ folderName: string }>();
  const decodedFolderName = folderName ? decodeURIComponent(folderName) : '';

  const { data: emails, isLoading, refetch, isRefetching } = useFolder(decodedFolderName);
  const markAsRead = useMarkAsRead();
  const deleteEmails = useDeleteEmails();
  const { toast } = useToast();
  const emailNav = useEmailClientNavigation();

  // Selection state
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());

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

  // Compute selection state
  const allSelected = useMemo(() => {
    if (sortedEmails.length === 0) return false;
    return sortedEmails.every((email) => selectedUids.has(email.uid));
  }, [sortedEmails, selectedUids]);

  const someSelected = useMemo(() => {
    return selectedUids.size > 0;
  }, [selectedUids]);

  const unreadSelectedCount = useMemo(() => {
    return sortedEmails.filter(
      (email) => selectedUids.has(email.uid) && !email.flags.includes('\\Seen')
    ).length;
  }, [sortedEmails, selectedUids]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (sortedEmails.length === 0) return;
    if (allSelected) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(sortedEmails.map((e) => e.uid)));
    }
  };

  const toggleSelect = (uid: number, event: React.MouseEvent) => {
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

  // Bulk actions
  const handleMarkAsRead = async () => {
    if (selectedUids.size === 0) return;

    try {
      await markAsRead.mutateAsync(Array.from(selectedUids));
      toast({
        title: 'Success',
        description: `${selectedUids.size} email(s) marked as read`,
      });
      setSelectedUids(new Set());
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark emails as read',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (selectedUids.size === 0) return;

    try {
      await deleteEmails.mutateAsync(Array.from(selectedUids));
      toast({
        title: 'Success',
        description: `${selectedUids.size} email(s) deleted`,
      });
      setSelectedUids(new Set());
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete emails',
        variant: 'destructive',
      });
    }
  };

  const clearSelection = () => {
    setSelectedUids(new Set());
  };

  const isProcessing = markAsRead.isPending || deleteEmails.isPending;

  return (
    <div className="h-full flex">
      <EmailSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getFolderDisplayName(decodedFolderName)}</h1>
            <p className="text-sm text-muted-foreground">
              {emails?.length || 0} messages
            </p>
          </div>
          <div className="flex gap-2">
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
              Refresh
            </Button>
            <Link to={emailNav.getComposePath()}>
              <Button size="sm" className="gap-2">
                <Mail className="h-4 w-4" />
                Compose
              </Button>
            </Link>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {someSelected && (
          <div className="border-b bg-muted/50 px-4 h-12 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-sm font-medium">
                {selectedUids.size} selected
              </span>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Mark as Read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
              >
                {deleteEmails.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={isProcessing}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Select All Row (when no selection) */}
        {!someSelected && sortedEmails.length > 0 && (
          <div className="border-b px-4 h-12 flex items-center gap-2 bg-muted/30">
            <Checkbox
              checked={false}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">Select all</span>
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <EmailListSkeleton />
          ) : sortedEmails.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MailOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No emails in this folder</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedEmails.map((email) => {
                const isSelected = selectedUids.has(email.uid);
                const isUnread = !email.flags.includes('\\Seen');

                return (
                  <div
                    key={email.uid}
                    className={`flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-muted/70' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className="pt-1 cursor-pointer"
                      onClick={(e) => toggleSelect(email.uid, e)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        aria-label={`Select email from ${email.from[0]?.name || email.from[0]?.address}`}
                      />
                    </div>

                    {/* Email Content (clickable link) */}
                    <Link
                      to={emailNav.getMessagePath(email.uid)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`truncate ${
                                isUnread ? 'font-bold' : 'font-semibold'
                              }`}
                            >
                              {email.from[0]?.name || email.from[0]?.address}
                            </p>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p
                            className={`text-sm mt-1 truncate ${
                              isUnread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {email.subject || '(No subject)'}
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
                  </div>
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
