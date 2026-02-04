import { useState } from 'react';

import { ReliefEntry } from '@/components/clients/relief-entry';
import { format } from 'date-fns';
import { Gift, Plus } from 'lucide-react';

import { ReliefType, type ReliefPeriodResponseDto } from '@/lib/api/endpoints/relief-periods';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useClientReliefPeriods,
  useCreateReliefPeriod,
  useDeleteReliefPeriod,
  useUpdateReliefPeriod,
} from '@/lib/hooks/use-relief-periods';
import { ReliefPeriodFormDialog } from '@/components/forms/relief-period-form-dialog';
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
import { TooltipProvider } from '@/components/ui/tooltip';

import type {
  CreateReliefPeriodFormData,
  UpdateReliefPeriodFormData,
} from '../forms/relief-period-form-dialog';

interface ReliefPeriodsCardProps {
  clientId: string;
}

export function ReliefPeriodsCard({ clientId }: ReliefPeriodsCardProps) {
  const { data: reliefPeriods, isPending, error } = useClientReliefPeriods(clientId);
  const createReliefPeriod = useCreateReliefPeriod();
  const updateReliefPeriod = useUpdateReliefPeriod();
  const deleteReliefPeriod = useDeleteReliefPeriod();
  const { canWrite, canDelete } = useModulePermissions('clients');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRelief, setEditingRelief] = useState<ReliefPeriodResponseDto | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingRelief(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (relief: ReliefPeriodResponseDto) => {
    setEditingRelief(relief);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: CreateReliefPeriodFormData | UpdateReliefPeriodFormData) => {
    if (editingRelief) {
      // Update existing relief period
      const updateData = data as UpdateReliefPeriodFormData;
      updateReliefPeriod.mutate(
        {
          clientId,
          reliefId: editingRelief.id,
          data: {
            startDate: updateData.startDate
              ? format(updateData.startDate, 'yyyy-MM-dd')
              : undefined,
            endDate: updateData.endDate ? format(updateData.endDate, 'yyyy-MM-dd') : undefined,
            isActive: updateData.isActive,
          },
        },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingRelief(undefined);
          },
        }
      );
    } else {
      // Create new relief period
      const createData = data as CreateReliefPeriodFormData;
      createReliefPeriod.mutate(
        {
          clientId,
          data: {
            reliefType: createData.reliefType as ReliefType,
            startDate: format(createData.startDate, 'yyyy-MM-dd'),
            endDate: createData.endDate ? format(createData.endDate, 'yyyy-MM-dd') : undefined,
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

  const handleDelete = (reliefId: string) => {
    deleteReliefPeriod.mutate(
      { clientId, reliefId },
      {
        onSuccess: () => {
          setDeletingId(null);
        },
      }
    );
  };

  // Get existing relief types to prevent duplicates
  const existingReliefTypes = reliefPeriods?.map((r) => r.reliefType as ReliefType) ?? [];

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Ulgi ZUS
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
            <Gift className="h-5 w-5" />
            Ulgi ZUS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">Nie udało się załadować ulg ZUS</p>
        </CardContent>
      </Card>
    );
  }

  const activeRelief = reliefPeriods?.find((r) => r.isActive);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Ulgi ZUS
            {activeRelief && (
              <Badge variant="default" className="ml-2 bg-green-500 hover:bg-green-600">
                Aktywna
              </Badge>
            )}
          </CardTitle>
          {canWrite && existingReliefTypes.length < Object.values(ReliefType).length && (
            <Button variant="outline" size="sm" className="gap-1" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Dodaj ulgę
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {reliefPeriods && reliefPeriods.length > 0 ? (
            <TooltipProvider>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {reliefPeriods.map((relief) => (
                    <ReliefEntry
                      key={relief.id}
                      relief={relief}
                      onEdit={() => handleOpenEdit(relief)}
                      onDelete={() => setDeletingId(relief.id)}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      isDeleting={deleteReliefPeriod.isPending && deletingId === relief.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TooltipProvider>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Brak ulg ZUS dla tego klienta
            </p>
          )}
        </CardContent>
      </Card>

      <ReliefPeriodFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingRelief(undefined);
        }}
        reliefPeriod={editingRelief}
        onSubmit={handleSubmit}
        isLoading={createReliefPeriod.isPending || updateReliefPeriod.isPending}
        existingReliefTypes={existingReliefTypes}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę ulgę?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Ulga zostanie trwale usunięta z historii klienta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReliefPeriod.isPending ? 'Usuwanie...' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
