import { useState, useMemo } from 'react';
import { useInbox, useMarkAsRead, useDeleteEmails } from '@/lib/hooks/use-email-client';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function EmailInbox() {
  const { data: emails, isLoading, refetch, isRefetching } = useInbox();
  const markAsRead = useMarkAsRead();
  const deleteEmails = useDeleteEmails();
  const { toast } = useToast();
  const emailNav = useEmailClientNavigation();

  // Selection state
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());

  // Compute selection state
  const allSelected = useMemo(() => {
    if (!emails || emails.length === 0) return false;
    return emails.every((email) => selectedUids.has(email.uid));
  }, [emails, selectedUids]);

  const someSelected = useMemo(() => {
    return selectedUids.size > 0;
  }, [selectedUids]);

  const unreadSelectedCount = useMemo(() => {
    if (!emails) return 0;
    return emails.filter(
      (email) => selectedUids.has(email.uid) && !email.flags.includes('\\Seen')
    ).length;
  }, [emails, selectedUids]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (!emails) return;
    if (allSelected) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(emails.map((e) => e.uid)));
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

  if (isLoading) {
    return <div className="p-8">Loading inbox...</div>;
  }

  const isProcessing = markAsRead.isPending || deleteEmails.isPending;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {emails?.length || 0} messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to={emailNav.getComposePath()}>
            <Button size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {someSelected && (
        <div className="border-b bg-muted/50 p-3 flex items-center gap-4">
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
      {!someSelected && emails && emails.length > 0 && (
        <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/30">
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
        {!emails || emails.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MailOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emails in inbox</p>
          </div>
        ) : (
          <div className="divide-y">
            {emails.map((email) => {
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
    </div>
  );
}
