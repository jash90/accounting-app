import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { TimeEntryResponseDto } from '@/types/dtos';

interface DeleteDialogProps {
  entry: TimeEntryResponseDto | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function TimeEntryDeleteDialog({
  entry,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <AlertDialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć wpis czasu?</AlertDialogTitle>
          <AlertDialogDescription>
            Ta operacja jest nieodwracalna. Wpis czasu zostanie trwale usunięty.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Usuń
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RejectDialogProps {
  entry: TimeEntryResponseDto | null;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function TimeEntryRejectDialog({
  entry,
  rejectionNote,
  onRejectionNoteChange,
  onClose,
  onConfirm,
}: RejectDialogProps) {
  return (
    <AlertDialog
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odrzuć wpis czasu</AlertDialogTitle>
          <AlertDialogDescription>
            Podaj powód odrzucenia wpisu &quot;{entry?.description || 'Bez opisu'}&quot;
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            id="rejection-note"
            aria-label="Powód odrzucenia"
            placeholder="Powód odrzucenia..."
            value={rejectionNote}
            onChange={(e) => onRejectionNoteChange(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!rejectionNote.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Odrzuć
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
