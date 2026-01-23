import { memo, useState } from 'react';

import { format, startOfToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarClock, Edit, PauseCircle, PlayCircle, Plus, Trash2 } from 'lucide-react';

import { SuspensionFormDialog } from '@/components/forms/suspension-form-dialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type SuspensionResponseDto } from '@/lib/api/endpoints/suspensions';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useClientSuspensions,
  useCreateSuspension,
  useDeleteSuspension,
  useUpdateSuspension,
} from '@/lib/hooks/use-suspensions';
import {
  type CreateSuspensionFormData,
  type UpdateSuspensionFormData,
} from '@/lib/validation/schemas';

interface SuspensionHistoryCardProps {
  clientId: string;
}

interface SuspensionEntryProps {
  suspension: SuspensionResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  canWrite: boolean;
  canDelete: boolean;
  isDeleting: boolean;
}

const SuspensionEntry = memo(function SuspensionEntry({
  suspension,
  onEdit,
  onDelete,
  canWrite,
  canDelete,
  isDeleting,
}: SuspensionEntryProps) {
  const startDate = new Date(suspension.startDate);
  const today = startOfToday();

  // Use server-calculated isActive for consistency
  const isActive = suspension.isActive;
  const isFuture = startDate > today;

  const statusLabel = isActive
    ? 'Aktywne zawieszenie'
    : isFuture
      ? 'Zaplanowane zawieszenie'
      : 'Zakończone zawieszenie';

  return (
    <div className="border-apptax-soft-teal relative border-l-2 pb-4 pl-4">
      <div
        className={`absolute top-0 -left-[7px] h-3 w-3 rounded-full ${
          isActive ? 'bg-amber-500' : isFuture ? 'bg-blue-500' : 'bg-gray-400'
        }`}
        role="status"
        aria-label={statusLabel}
      />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600">
              <PauseCircle className="h-3 w-3" />
              Aktywne zawieszenie
            </Badge>
          ) : isFuture ? (
            <Badge variant="secondary" className="gap-1">
              <CalendarClock className="h-3 w-3" />
              Zaplanowane
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <PlayCircle className="h-3 w-3" />
              Zakończone
            </Badge>
          )}
        </div>

        <div className="flex gap-1">
          {canWrite && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                  aria-label="Edytuj zawieszenie"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edytuj zawieszenie</TooltipContent>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onDelete}
                  disabled={isDeleting}
                  aria-label="Usuń zawieszenie"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Usuń zawieszenie</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Od: </span>
          <span className="font-medium">{format(startDate, 'd MMMM yyyy', { locale: pl })}</span>
        </p>
        {suspension.endDate ? (
          <p>
            <span className="text-muted-foreground">Do: </span>
            <span className="font-medium">
              {format(new Date(suspension.endDate), 'd MMMM yyyy', { locale: pl })}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground italic">Data odwieszenia nie ustalona</p>
        )}
        {suspension.reason && (
          <p className="text-muted-foreground mt-2">
            <span className="font-medium">Powód: </span>
            {suspension.reason}
          </p>
        )}
        {suspension.createdByName && (
          <p className="text-muted-foreground text-xs mt-2">
            Utworzono przez: {suspension.createdByName}
          </p>
        )}
      </div>
    </div>
  );
});

export function SuspensionHistoryCard({ clientId }: SuspensionHistoryCardProps) {
  const { data: suspensions, isPending, error } = useClientSuspensions(clientId);
  const createSuspension = useCreateSuspension();
  const updateSuspension = useUpdateSuspension();
  const deleteSuspension = useDeleteSuspension();
  const { canWrite, canDelete } = useModulePermissions('clients');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSuspension, setEditingSuspension] = useState<SuspensionResponseDto | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingSuspension(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (suspension: SuspensionResponseDto) => {
    setEditingSuspension(suspension);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: CreateSuspensionFormData | UpdateSuspensionFormData) => {
    if (editingSuspension) {
      // Update existing suspension
      const updateData = data as UpdateSuspensionFormData;
      updateSuspension.mutate(
        {
          clientId,
          suspensionId: editingSuspension.id,
          data: {
            endDate: updateData.endDate ? format(updateData.endDate, 'yyyy-MM-dd') : undefined,
            reason: updateData.reason,
          },
        },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingSuspension(undefined);
          },
        }
      );
    } else {
      // Create new suspension
      const createData = data as CreateSuspensionFormData;
      createSuspension.mutate(
        {
          clientId,
          data: {
            startDate: format(createData.startDate, 'yyyy-MM-dd'),
            endDate: createData.endDate ? format(createData.endDate, 'yyyy-MM-dd') : undefined,
            reason: createData.reason,
          },
        },
        {
          onSuccess: () => {
            setIsFormOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = (suspensionId: string) => {
    deleteSuspension.mutate(
      { clientId, suspensionId },
      {
        onSuccess: () => {
          setDeletingId(null);
        },
      }
    );
  };

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5" />
            Historia zawieszeń
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-3 w-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5" />
            Historia zawieszeń
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">Nie udało się załadować historii zawieszeń</p>
        </CardContent>
      </Card>
    );
  }

  const activeSuspension = suspensions?.find((s) => s.isActive);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5" />
            Historia zawieszeń
            {activeSuspension && (
              <Badge variant="default" className="ml-2 bg-amber-500 hover:bg-amber-600">
                Aktywne
              </Badge>
            )}
          </CardTitle>
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Dodaj zawieszenie
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {suspensions && suspensions.length > 0 ? (
            <TooltipProvider>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {suspensions.map((suspension) => (
                    <SuspensionEntry
                      key={suspension.id}
                      suspension={suspension}
                      onEdit={() => handleOpenEdit(suspension)}
                      onDelete={() => setDeletingId(suspension.id)}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      isDeleting={deleteSuspension.isPending && deletingId === suspension.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TooltipProvider>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Brak historii zawieszeń dla tego klienta
            </p>
          )}
        </CardContent>
      </Card>

      <SuspensionFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingSuspension(undefined);
        }}
        suspension={editingSuspension}
        onSubmit={handleSubmit}
        isLoading={createSuspension.isPending || updateSuspension.isPending}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć to zawieszenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Zawieszenie zostanie trwale usunięte z historii.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSuspension.isPending ? 'Usuwanie...' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
