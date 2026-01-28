import { useState } from 'react';

import { Trash2, RotateCcw, Edit, ChevronDown, X } from 'lucide-react';

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
  type EmploymentType,
  EmploymentTypeLabels,
  type VatStatus,
  VatStatusLabels,
  type TaxScheme,
  TaxSchemeLabels,
  type ZusStatus,
  ZusStatusLabels,
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

export function BulkActionsToolbar({
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editChanges, setEditChanges] = useState<BulkEditChanges>({});

  const activeClients = selectedClients.filter((c) => c.isActive);
  const inactiveClients = selectedClients.filter((c) => !c.isActive);

  const handleBulkDelete = () => {
    onBulkDelete(activeClients.map((c) => c.id));
    setDeleteDialogOpen(false);
  };

  const handleBulkRestore = () => {
    onBulkRestore(inactiveClients.map((c) => c.id));
    setRestoreDialogOpen(false);
  };

  const handleBulkEdit = () => {
    if (Object.keys(editChanges).length === 0) return;
    onBulkEdit(
      activeClients.map((c) => c.id),
      editChanges
    );
    setEditDialogOpen(false);
    setEditChanges({});
  };

  if (selectedClients.length === 0) return null;

  return (
    <>
      <div className="bg-apptax-soft-teal/30 border-apptax-soft-teal flex items-center gap-2 rounded-lg border p-3">
        <span className="text-apptax-navy text-sm font-medium">
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
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edytuj ({activeClients.length})
              </DropdownMenuItem>
            )}

            {canDelete && activeClients.length > 0 && (
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń ({activeClients.length})
              </DropdownMenuItem>
            )}

            {inactiveClients.length > 0 && (
              <DropdownMenuItem onClick={() => setRestoreDialogOpen(true)}>
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
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
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleBulkRestore} disabled={isRestoring}>
              {isRestoring ? 'Przywracanie...' : 'Przywróć'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
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
}
