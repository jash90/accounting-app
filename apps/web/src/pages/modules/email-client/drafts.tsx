import { useState } from 'react';

import {
  AlertTriangle,
  Cloud,
  CloudOff,
  Edit,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  useDeleteAllDrafts,
  useDraftConflicts,
  useDrafts,
  useResolveConflict,
  useSendDraft,
  useSyncDrafts,
} from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';

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
      return (
        <span title="Zsynchronizowano z serwerem">
          <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
        </span>
      );
    case 'local':
      return (
        <span title="Tylko lokalnie">
          <CloudOff className="h-4 w-4 text-muted-foreground" />
        </span>
      );
    case 'imap_only':
      return (
        <span title="Tylko na serwerze">
          <Cloud className="h-4 w-4 text-blue-500 dark:text-blue-400" />
        </span>
      );
    case 'conflict':
      return (
        <span title="Konflikt synchronizacji">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </span>
      );
    default:
      return <CloudOff className="h-4 w-4 text-muted-foreground" />;
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
      toast({ title: 'Sukces', description: 'Szkic został wysłany' });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się wysłać szkicu', variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncDrafts.mutateAsync();
      toast({
        title: 'Synchronizacja zakończona',
        description: `Zsynchronizowano: ${result.synced}, Zaimportowano: ${result.imported}, Konflikty: ${result.conflicts}`,
      });
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zsynchronizować szkiców',
        variant: 'destructive',
      });
    }
  };

  const handleResolveConflict = async (resolution: 'keep_local' | 'keep_imap') => {
    if (!selectedConflict) return;

    try {
      await resolveConflict.mutateAsync({
        draftId: selectedConflict.id,
        resolution,
      });
      toast({ title: 'Sukces', description: 'Konflikt rozwiązany' });
      setConflictDialogOpen(false);
      setSelectedConflict(null);
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się rozwiązać konfliktu',
        variant: 'destructive',
      });
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
        title: 'Sukces',
        description: `Usunięto ${result.deleted} szkiców${result.errors.length > 0 ? ` (${result.errors.length} błędów)` : ''}`,
      });
      setDeleteAllDialogOpen(false);
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć szkiców', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-8">Ładowanie szkiców...</div>;
  }

  const conflictCount = conflicts?.length || 0;

  return (
    <div className="flex h-full">
      <EmailSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Szkice</h1>
              <p className="text-muted-foreground text-sm">
                {drafts?.length || 0} zapisanych szkiców
                {conflictCount > 0 && (
                  <span className="ml-2 text-yellow-600">
                    ({conflictCount} {conflictCount === 1 ? 'konflikt' : 'konflikty'})
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Synchronizuj
              </Button>
              {drafts && drafts.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteAllDialogOpen(true)}
                  disabled={deleteAllDrafts.isPending}
                >
                  {deleteAllDrafts.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Usuń wszystkie
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {!drafts || drafts.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center">
              <Edit className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Brak zapisanych szkiców</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => emailNav.toCompose()}
              >
                Napisz nową wiadomość
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {drafts.map((draft) => (
                <div key={draft.id} className="hover:bg-muted/50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <SyncStatusIcon status={draft.syncStatus} />
                        <p className="truncate font-semibold">Do: {draft.to.join(', ')}</p>
                        {draft.isAiGenerated && (
                          <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            <Sparkles className="mr-1 h-3 w-3" />
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
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Rozwiąż
                          </Button>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {draft.subject || '(Brak tematu)'}
                      </p>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {draft.textContent.substring(0, 100)}...
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Zaktualizowano: {new Date(draft.updatedAt).toLocaleString('pl-PL')}
                      </p>
                    </div>
                    <div className="ml-4 flex gap-2">
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
              <DialogTitle>Rozwiąż konflikt synchronizacji</DialogTitle>
              <DialogDescription>
                Ten szkic został zmodyfikowany zarówno lokalnie, jak i na serwerze. Wybierz, którą
                wersję zachować.
              </DialogDescription>
            </DialogHeader>
            {selectedConflict && (
              <div className="py-4">
                <p className="text-sm font-medium">
                  Szkic: {selectedConflict.subject || '(Brak tematu)'}
                </p>
                <p className="text-muted-foreground text-sm">
                  Do: {selectedConflict.to.join(', ')}
                </p>
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleResolveConflict('keep_imap')}
                disabled={resolveConflict.isPending}
              >
                {resolveConflict.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zachowaj wersję z serwera
              </Button>
              <Button
                onClick={() => handleResolveConflict('keep_local')}
                disabled={resolveConflict.isPending}
              >
                {resolveConflict.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zachowaj wersję lokalną
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usuń wszystkie szkice</DialogTitle>
              <DialogDescription>
                Czy na pewno chcesz usunąć wszystkie {drafts?.length || 0} szkice? Tej akcji nie
                można cofnąć. Szkice zostaną usunięte zarówno z lokalnej pamięci, jak i z serwera
                email.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteAllDialogOpen(false)}
                disabled={deleteAllDrafts.isPending}
              >
                Anuluj
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={deleteAllDrafts.isPending}
              >
                {deleteAllDrafts.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Usuń wszystkie szkice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
