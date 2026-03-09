import { memo, useCallback, useMemo, useState } from 'react';

import { ChevronDown, Edit, RotateCcw, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ClientResponseDto } from '@/types/dtos';
import {
  EmploymentTypeLabels,
  TaxSchemeLabels,
  VatStatusLabels,
  ZusStatusLabels,
  type EmploymentType,
  type TaxScheme,
  type VatStatus,
  type ZusStatus,
} from '@/types/enums';

interface BulkActionsToolbarProps {
  selectedClients: ClientResponseDto[];
  onClearSelection: () => void;
  onBulkDelete: (clientIds: string[]) => void;
  onBulkRestore: (clientIds: string[]) => void;
  onBulkEdit: (clientIds: string[], changes: BulkEditChanges) => void;
  isDeleting?: boolean;
  isRestoring?: boolean;
  isEditing?: boolean;
  canDelete?: boolean;
}

export interface BulkEditChanges {
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
}

export const BulkActionsToolbar = memo(function BulkActionsToolbar({
  selectedClients,
  onClearSelection,
  onBulkDelete,
  onBulkRestore,
  onBulkEdit,
  isDeleting = false,
  isRestoring = false,
  isEditing = false,
  canDelete = false,
}: BulkActionsToolbarProps) {
  // Consolidate dialog state into single union type - reduces re-renders for mutually exclusive state
  type DialogType = 'delete' | 'restore' | 'edit' | null;
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [editChanges, setEditChanges] = useState<BulkEditChanges>({});

  // Single loop to partition clients by active status - avoids iterating twice
  const { activeClients, inactiveClients } = useMemo(() => {
    const active: ClientResponseDto[] = [];
    const inactive: ClientResponseDto[] = [];
    for (const client of selectedClients) {
      if (client.isActive) {
        active.push(client);
      } else {
        inactive.push(client);
      }
    }
    return { activeClients: active, inactiveClients: inactive };
  }, [selectedClients]);

  const handleBulkDelete = useCallback(() => {
    onBulkDelete(activeClients.map((c) => c.id));
    setOpenDialog(null);
  }, [onBulkDelete, activeClients]);

  const handleBulkRestore = useCallback(() => {
    onBulkRestore(inactiveClients.map((c) => c.id));
    setOpenDialog(null);
  }, [onBulkRestore, inactiveClients]);

  const handleBulkEdit = useCallback(() => {
    if (Object.keys(editChanges).length === 0) return;
    onBulkEdit(
      activeClients.map((c) => c.id),
      editChanges
    );
    setOpenDialog(null);
    setEditChanges({});
  }, [onBulkEdit, activeClients, editChanges]);

  if (selectedClients.length === 0) return null;

  return (
    <>
      <div className="bg-accent/10 border-accent flex items-center gap-2 rounded-lg border p-3">
        <span className="text-foreground text-sm font-medium">
          Zaznaczono {selectedClients.length}{' '}
          {selectedClients.length === 1
            ? 'klienta'
            : selectedClients.length < 5
              ? 'klientów'
              : 'klientów'}
        </span>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Akcje zbiorcze
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Operacje</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {activeClients.length > 0 && (
              <DropdownMenuItem onClick={() => setOpenDialog('edit')}>
                <Edit className="mr-2 h-4 w-4" />
                Edytuj ({activeClients.length})
              </DropdownMenuItem>
            )}

            {canDelete && activeClients.length > 0 && (
              <DropdownMenuItem
                onClick={() => setOpenDialog('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń ({activeClients.length})
              </DropdownMenuItem>
            )}

            {inactiveClients.length > 0 && (
              <DropdownMenuItem onClick={() => setOpenDialog('restore')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Przywróć ({inactiveClients.length})
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDialog === 'delete'}
        onOpenChange={(open) => setOpenDialog(open ? 'delete' : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń {activeClients.length} klientów</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć zaznaczonych klientów? Operacja ta jest odwracalna -
              klienci zostaną dezaktywowani i będzie można ich przywrócić.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto">
            <ul className="text-muted-foreground space-y-1 text-sm">
              {activeClients.slice(0, 10).map((client) => (
                <li key={client.id}>• {client.name}</li>
              ))}
              {activeClients.length > 10 && <li>... i {activeClients.length - 10} więcej</li>}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={openDialog === 'restore'}
        onOpenChange={(open) => setOpenDialog(open ? 'restore' : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przywróć {inactiveClients.length} klientów</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz przywrócić zaznaczonych klientów?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto">
            <ul className="text-muted-foreground space-y-1 text-sm">
              {inactiveClients.slice(0, 10).map((client) => (
                <li key={client.id}>• {client.name}</li>
              ))}
              {inactiveClients.length > 10 && <li>... i {inactiveClients.length - 10} więcej</li>}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              Anuluj
            </Button>
            <Button onClick={handleBulkRestore} disabled={isRestoring}>
              {isRestoring ? 'Przywracanie...' : 'Przywróć'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog
        open={openDialog === 'edit'}
        onOpenChange={(open) => setOpenDialog(open ? 'edit' : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj {activeClients.length} klientów</DialogTitle>
            <DialogDescription>
              Wybierz pola, które chcesz zmienić. Tylko wypełnione pola zostaną zaktualizowane.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Typ zatrudnienia</Label>
              <Select
                value={editChanges.employmentType || '__none__'}
                onValueChange={(value) =>
                  setEditChanges((prev) => ({
                    ...prev,
                    employmentType: value === '__none__' ? undefined : (value as EmploymentType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bez zmian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez zmian</SelectItem>
                  {Object.entries(EmploymentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status VAT</Label>
              <Select
                value={editChanges.vatStatus || '__none__'}
                onValueChange={(value) =>
                  setEditChanges((prev) => ({
                    ...prev,
                    vatStatus: value === '__none__' ? undefined : (value as VatStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bez zmian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez zmian</SelectItem>
                  {Object.entries(VatStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Schemat podatkowy</Label>
              <Select
                value={editChanges.taxScheme || '__none__'}
                onValueChange={(value) =>
                  setEditChanges((prev) => ({
                    ...prev,
                    taxScheme: value === '__none__' ? undefined : (value as TaxScheme),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bez zmian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez zmian</SelectItem>
                  {Object.entries(TaxSchemeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status ZUS</Label>
              <Select
                value={editChanges.zusStatus || '__none__'}
                onValueChange={(value) =>
                  setEditChanges((prev) => ({
                    ...prev,
                    zusStatus: value === '__none__' ? undefined : (value as ZusStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bez zmian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez zmian</SelectItem>
                  {Object.entries(ZusStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              Anuluj
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={
                isEditing ||
                Object.keys(editChanges).filter((k) => editChanges[k as keyof BulkEditChanges])
                  .length === 0
              }
            >
              {isEditing ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
