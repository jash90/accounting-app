import { useState } from 'react';
import { useDrafts, useSendDraft, useSyncDrafts, useDraftConflicts, useResolveConflict, useDeleteAllDrafts } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { Button } from '@/components/ui/button';
import { Send, Edit, Sparkles, RefreshCw, Cloud, CloudOff, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmailSidebar } from './components/email-sidebar';

type SyncStatus = 'local' | 'synced' | 'imap_only' | 'conflict';

interface Draft {
  id: string;
  to: string[];
  subject?: string;
  textContent: string;
  isAiGenerated: boolean;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'synced':
      return <Cloud className="h-4 w-4 text-green-600" title="Synced with server" />;
    case 'local':
      return <CloudOff className="h-4 w-4 text-gray-400" title="Local only" />;
    case 'imap_only':
      return <Cloud className="h-4 w-4 text-blue-500" title="Server only" />;
    case 'conflict':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" title="Sync conflict" />;
    default:
      return <CloudOff className="h-4 w-4 text-gray-400" />;
  }
}

export default function EmailDrafts() {
  const { data: drafts, isLoading } = useDrafts();
  const sendDraft = useSendDraft();
  const syncDrafts = useSyncDrafts();
  const { data: conflicts } = useDraftConflicts();
  const resolveConflict = useResolveConflict();
  const deleteAllDrafts = useDeleteAllDrafts();
  const emailNav = useEmailClientNavigation();
  const { toast } = useToast();

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Draft | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const handleSendDraft = async (draftId: string) => {
    try {
      await sendDraft.mutateAsync(draftId);
      toast({ title: 'Success', description: 'Draft sent successfully' });
    } catch {
      toast({ title: 'Error', description: 'Failed to send draft', variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncDrafts.mutateAsync();
      toast({
        title: 'Sync Complete',
        description: `Synced: ${result.synced}, Imported: ${result.imported}, Conflicts: ${result.conflicts}`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to sync drafts', variant: 'destructive' });
    }
  };

  const handleResolveConflict = async (resolution: 'keep_local' | 'keep_imap') => {
    if (!selectedConflict) return;

    try {
      await resolveConflict.mutateAsync({
        draftId: selectedConflict.id,
        resolution,
      });
      toast({ title: 'Success', description: 'Conflict resolved' });
      setConflictDialogOpen(false);
      setSelectedConflict(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve conflict', variant: 'destructive' });
    }
  };

  const openConflictDialog = (draft: Draft) => {
    setSelectedConflict(draft);
    setConflictDialogOpen(true);
  };

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllDrafts.mutateAsync();
      toast({
        title: 'Success',
        description: `Deleted ${result.deleted} drafts${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ''}`,
      });
      setDeleteAllDialogOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete drafts', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading drafts...</div>;
  }

  const conflictCount = conflicts?.length || 0;

  return (
    <div className="h-full flex">
      <EmailSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Drafts</h1>
            <p className="text-sm text-muted-foreground">
              {drafts?.length || 0} saved drafts
              {conflictCount > 0 && (
                <span className="ml-2 text-yellow-600">
                  ({conflictCount} conflict{conflictCount > 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncDrafts.isPending}
            >
              {syncDrafts.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync with Server
            </Button>
            {drafts && drafts.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={deleteAllDrafts.isPending}
              >
                {deleteAllDrafts.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete All
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!drafts || drafts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No drafts saved</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => emailNav.toCompose()}
            >
              Compose New Email
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <SyncStatusIcon status={draft.syncStatus} />
                      <p className="font-semibold truncate">
                        To: {draft.to.join(', ')}
                      </p>
                      {draft.isAiGenerated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </span>
                      )}
                      {draft.syncStatus === 'conflict' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-yellow-600 hover:text-yellow-700"
                          onClick={() => openConflictDialog(draft)}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">
                      {draft.subject || '(No subject)'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {draft.textContent.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated: {new Date(draft.updatedAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => emailNav.toComposeWithQuery(`draftId=${draft.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendDraft(draft.id)}
                      disabled={sendDraft.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Sync Conflict</DialogTitle>
            <DialogDescription>
              This draft has been modified both locally and on the server. Choose which version to keep.
            </DialogDescription>
          </DialogHeader>
          {selectedConflict && (
            <div className="py-4">
              <p className="text-sm font-medium">Draft: {selectedConflict.subject || '(No subject)'}</p>
              <p className="text-sm text-muted-foreground">To: {selectedConflict.to.join(', ')}</p>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleResolveConflict('keep_imap')}
              disabled={resolveConflict.isPending}
            >
              {resolveConflict.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Keep Server Version
            </Button>
            <Button
              onClick={() => handleResolveConflict('keep_local')}
              disabled={resolveConflict.isPending}
            >
              {resolveConflict.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Keep Local Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Drafts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {drafts?.length || 0} drafts? This action cannot be undone.
              Drafts will be removed from both local storage and the email server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialogOpen(false)}
              disabled={deleteAllDrafts.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteAllDrafts.isPending}
            >
              {deleteAllDrafts.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All Drafts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
