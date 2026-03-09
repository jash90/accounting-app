import { useReducer } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Edit, Plus, Settings, Tag, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthContext } from '@/contexts/auth-context';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useCreateTaskLabel,
  useDeleteTaskLabel,
  useTaskLabels,
  useUpdateTaskLabel,
} from '@/lib/hooks/use-tasks';
import {
  type CreateTaskLabelDto,
  type TaskLabelResponseDto,
  type UpdateTaskLabelDto,
} from '@/types/dtos';
import { UserRole } from '@/types/enums';

// -- Reducer for label dialog state --
interface LabelDialogState {
  dialogOpen: boolean;
  editingLabel: TaskLabelResponseDto | null;
  deletingLabel: TaskLabelResponseDto | null;
  labelName: string;
  labelColor: string;
}

type LabelDialogAction =
  | { type: 'OPEN_CREATE'; defaultColor: string }
  | { type: 'OPEN_EDIT'; payload: TaskLabelResponseDto }
  | { type: 'CLOSE_DIALOG'; defaultColor: string }
  | { type: 'SET_DELETING'; payload: TaskLabelResponseDto | null }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_COLOR'; payload: string };

const labelDialogInitialState: LabelDialogState = {
  dialogOpen: false,
  editingLabel: null,
  deletingLabel: null,
  labelName: '',
  labelColor: '',
};

function labelDialogReducer(state: LabelDialogState, action: LabelDialogAction): LabelDialogState {
  switch (action.type) {
    case 'OPEN_CREATE':
      return {
        ...state,
        dialogOpen: true,
        editingLabel: null,
        labelName: '',
        labelColor: action.defaultColor,
      };
    case 'OPEN_EDIT':
      return {
        ...state,
        dialogOpen: true,
        editingLabel: action.payload,
        labelName: action.payload.name,
        labelColor: action.payload.color,
      };
    case 'CLOSE_DIALOG':
      return {
        ...state,
        dialogOpen: false,
        labelName: '',
        labelColor: action.defaultColor,
        editingLabel: null,
      };
    case 'SET_DELETING':
      return { ...state, deletingLabel: action.payload };
    case 'SET_NAME':
      return { ...state, labelName: action.payload };
    case 'SET_COLOR':
      return { ...state, labelColor: action.payload };
  }
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export default function TasksSettingsPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const { hasWritePermission, hasDeletePermission } = useModulePermissions('tasks');

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks';
      default:
        return '/modules/tasks';
    }
  };

  const basePath = getBasePath();

  const { data: labelsResponse, isPending } = useTaskLabels();
  const labels = labelsResponse?.data ?? [];
  const createLabel = useCreateTaskLabel();
  const updateLabel = useUpdateTaskLabel();
  const deleteLabel = useDeleteTaskLabel();

  const [labelState, dispatchLabel] = useReducer(labelDialogReducer, {
    ...labelDialogInitialState,
    labelColor: DEFAULT_COLORS[0],
  });
  const {
    dialogOpen: labelDialogOpen,
    editingLabel,
    deletingLabel,
    labelName,
    labelColor,
  } = labelState;

  const handleOpenCreateDialog = () => {
    dispatchLabel({ type: 'OPEN_CREATE', defaultColor: DEFAULT_COLORS[0] });
  };

  const handleOpenEditDialog = (label: TaskLabelResponseDto) => {
    dispatchLabel({ type: 'OPEN_EDIT', payload: label });
  };

  const handleSaveLabel = async () => {
    if (!labelName.trim()) return;

    if (editingLabel) {
      await updateLabel.mutateAsync({
        id: editingLabel.id,
        data: { name: labelName, color: labelColor } as UpdateTaskLabelDto,
      });
    } else {
      await createLabel.mutateAsync({ name: labelName, color: labelColor } as CreateTaskLabelDto);
    }

    dispatchLabel({ type: 'CLOSE_DIALOG', defaultColor: DEFAULT_COLORS[0] });
  };

  const handleDeleteLabel = async () => {
    if (!deletingLabel) return;
    await deleteLabel.mutateAsync(deletingLabel.id);
    dispatchLabel({ type: 'SET_DELETING', payload: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Ustawienia zadań"
        description="Zarządzaj etykietami i konfiguracją modułu zadań"
        icon={<Settings className="h-6 w-6" />}
      />

      {/* Labels Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Etykiety
              </CardTitle>
              <CardDescription>Twórz i zarządzaj etykietami do kategoryzacji zadań</CardDescription>
            </div>
            {hasWritePermission && (
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nowa etykieta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : labels && labels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kolor</TableHead>
                  <TableHead>Nazwa</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labels.map((label) => (
                  <TableRow key={label.id}>
                    <TableCell>
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: label.color }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{label.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasWritePermission && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(label)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasDeletePermission && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => dispatchLabel({ type: 'SET_DELETING', payload: label })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <Tag className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Brak etykiet</p>
              <p className="text-sm">Utwórz pierwszą etykietę, aby kategoryzować zadania</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Label Create/Edit Dialog */}
      <Dialog
        open={labelDialogOpen}
        onOpenChange={(open) => {
          if (!open) dispatchLabel({ type: 'CLOSE_DIALOG', defaultColor: DEFAULT_COLORS[0] });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLabel ? 'Edytuj etykietę' : 'Nowa etykieta'}</DialogTitle>
            <DialogDescription>
              {editingLabel
                ? 'Zmień nazwę lub kolor etykiety'
                : 'Utwórz nową etykietę do kategoryzacji zadań'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Nazwa</Label>
              <Input
                id="label-name"
                value={labelName}
                onChange={(e) => dispatchLabel({ type: 'SET_NAME', payload: e.target.value })}
                placeholder="np. Pilne, Bug, Feature..."
              />
            </div>

            <div className="space-y-2">
              <Label>Kolor</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      labelColor === color
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => dispatchLabel({ type: 'SET_COLOR', payload: color })}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor="custom-color" className="text-sm">
                  Własny:
                </Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={labelColor}
                  onChange={(e) => dispatchLabel({ type: 'SET_COLOR', payload: e.target.value })}
                  className="h-8 w-12 border-0 p-0"
                />
                <span className="text-muted-foreground text-sm">{labelColor}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Podgląd:</span>
              <span
                className="rounded-full px-2 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: labelColor }}
              >
                {labelName || 'Etykieta'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                dispatchLabel({ type: 'CLOSE_DIALOG', defaultColor: DEFAULT_COLORS[0] })
              }
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSaveLabel}
              disabled={!labelName.trim() || createLabel.isPending || updateLabel.isPending}
            >
              {editingLabel ? 'Zapisz' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deletingLabel && (
        <ConfirmDialog
          open={!!deletingLabel}
          onOpenChange={(open) => !open && dispatchLabel({ type: 'SET_DELETING', payload: null })}
          title="Usuń etykietę"
          description={`Czy na pewno chcesz usunąć etykietę "${deletingLabel.name}"? Ta akcja usunie etykietę ze wszystkich zadań.`}
          variant="destructive"
          onConfirm={handleDeleteLabel}
          isLoading={deleteLabel.isPending}
        />
      )}
    </div>
  );
}
