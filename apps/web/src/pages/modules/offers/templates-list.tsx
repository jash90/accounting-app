import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';

import { OfferTemplateFormDialog } from '@/components/forms/offer-template-form-dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useCreateOfferTemplate,
  useDeleteOfferTemplate,
  useDownloadOfferTemplateFile,
  useOfferTemplates,
  useUpdateOfferTemplate,
  useUploadOfferTemplateFile,
} from '@/lib/hooks/use-offers';
import {
  type CreateOfferTemplateFormData,
  type UpdateOfferTemplateFormData,
} from '@/lib/validation/schemas';
import { type OfferTemplateFiltersDto, type OfferTemplateResponseDto } from '@/types/dtos';

// -- Reducer for template dialog states --
interface TemplateDialogState {
  isCreateDialogOpen: boolean;
  editingTemplate: OfferTemplateResponseDto | undefined;
  deletingTemplateId: string | null;
  uploadingTemplateId: string | null;
}

type TemplateDialogAction =
  | { type: 'OPEN_CREATE' }
  | { type: 'CLOSE_CREATE' }
  | { type: 'SET_EDITING'; payload: OfferTemplateResponseDto | undefined }
  | { type: 'SET_DELETING'; payload: string | null }
  | { type: 'SET_UPLOADING'; payload: string | null };

const templateDialogInitialState: TemplateDialogState = {
  isCreateDialogOpen: false,
  editingTemplate: undefined,
  deletingTemplateId: null,
  uploadingTemplateId: null,
};

function templateDialogReducer(
  state: TemplateDialogState,
  action: TemplateDialogAction
): TemplateDialogState {
  switch (action.type) {
    case 'OPEN_CREATE':
      return { ...state, isCreateDialogOpen: true };
    case 'CLOSE_CREATE':
      return { ...state, isCreateDialogOpen: false };
    case 'SET_EDITING':
      return { ...state, editingTemplate: action.payload };
    case 'SET_DELETING':
      return { ...state, deletingTemplateId: action.payload };
    case 'SET_UPLOADING':
      return { ...state, uploadingTemplateId: action.payload };
  }
}

export default function TemplatesListPage() {
  'use no memo';
  const navigate = useNavigate();
  const basePath = useModuleBasePath('offers');

  const [searchValue, setSearchValue] = useState('');

  const [filters, setFilters] = useState<OfferTemplateFiltersDto>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogState, dispatchDialog] = useReducer(
    templateDialogReducer,
    templateDialogInitialState
  );
  const { isCreateDialogOpen, editingTemplate, deletingTemplateId, uploadingTemplateId } =
    dialogState;

  // Hidden file input ref for accessible file uploads (H4)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input to avoid firing API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchValue || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const { data, isPending, refetch } = useOfferTemplates(filters);
  const templates = data?.data ?? [];

  const createMutation = useCreateOfferTemplate();
  const updateMutation = useUpdateOfferTemplate();
  const deleteMutation = useDeleteOfferTemplate();
  const uploadFileMutation = useUploadOfferTemplateFile();
  const downloadFileMutation = useDownloadOfferTemplateFile();

  const handleFileUpload = useCallback(
    (template: OfferTemplateResponseDto) => {
      dispatchDialog({ type: 'SET_UPLOADING', payload: template.id });
      fileInputRef.current?.click();
    },
    [dispatchDialog]
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && uploadingTemplateId) {
        await uploadFileMutation.mutateAsync({ id: uploadingTemplateId, file });
        refetch();
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
      dispatchDialog({ type: 'SET_UPLOADING', payload: null });
    },
    [uploadingTemplateId, uploadFileMutation, refetch]
  );

  const handleFileDownload = useCallback(
    async (template: OfferTemplateResponseDto) => {
      if (!template.templateFileName) return;
      await downloadFileMutation.mutateAsync({
        id: template.id,
        filename: template.templateFileName,
      });
    },
    [downloadFileMutation]
  );

  const columns: ColumnDef<OfferTemplateResponseDto>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nazwa',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.isDefault && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-0">
                <Star className="mr-1 h-3 w-3" />
                Domyślny
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Opis',
        cell: ({ row }) => (
          <div className="max-w-[250px] truncate text-muted-foreground">
            {row.original.description || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'defaultValidityDays',
        header: 'Ważność (dni)',
        cell: ({ row }) => `${row.original.defaultValidityDays} dni`,
      },
      {
        accessorKey: 'defaultVatRate',
        header: 'VAT (%)',
        cell: ({ row }) => `${row.original.defaultVatRate}%`,
      },
      {
        accessorKey: 'templateFileName',
        header: 'Plik szablonu',
        cell: ({ row }) =>
          row.original.templateFileName ? (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-0">
              {row.original.templateFileName}
            </Badge>
          ) : (
            <span className="text-muted-foreground">Brak pliku</span>
          ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.isActive
                ? 'bg-green-100 text-green-700 border-0'
                : 'bg-gray-100 text-gray-700 border-0'
            }
          >
            {row.original.isActive ? 'Aktywny' : 'Nieaktywny'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const template = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Akcje">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => dispatchDialog({ type: 'SET_EDITING', payload: template })}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(`${basePath}/templates/${template.id}/editor`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Edytuj treść
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFileUpload(template)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Prześlij plik DOCX
                </DropdownMenuItem>
                {template.templateFileName && (
                  <DropdownMenuItem onClick={() => handleFileDownload(template)}>
                    <Download className="mr-2 h-4 w-4" />
                    Pobierz plik
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => dispatchDialog({ type: 'SET_DELETING', payload: template.id })}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleFileUpload, handleFileDownload, basePath, navigate]
  );

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const handleCreateTemplate = async (
    data: CreateOfferTemplateFormData | UpdateOfferTemplateFormData
  ) => {
    await createMutation.mutateAsync(data as CreateOfferTemplateFormData);
    dispatchDialog({ type: 'CLOSE_CREATE' });
  };

  const handleUpdateTemplate = async (
    data: CreateOfferTemplateFormData | UpdateOfferTemplateFormData
  ) => {
    if (!editingTemplate) return;
    await updateMutation.mutateAsync({
      id: editingTemplate.id,
      data: data as UpdateOfferTemplateFormData,
    });
    dispatchDialog({ type: 'SET_EDITING', payload: undefined });
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplateId) return;
    await deleteMutation.mutateAsync(deletingTemplateId);
    dispatchDialog({ type: 'SET_DELETING', payload: null });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(basePath)} aria-label="Wróć">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold">Szablony ofert</h1>
            <p className="text-muted-foreground">Zarządzaj szablonami dokumentów ofertowych</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Odśwież">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => dispatchDialog({ type: 'OPEN_CREATE' })}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nowy szablon
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Szukaj..."
          className="w-64"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Brak szablonów do wyświetlenia.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {data && (
        <div className="text-muted-foreground text-sm">
          Wyświetlono {templates.length} z {data.meta.total} szablonów
        </div>
      )}

      {/* Hidden file input for template upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        aria-label="Prześlij plik szablonu DOCX"
        onChange={handleFileInputChange}
      />

      {/* Dialogs */}
      <OfferTemplateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => dispatchDialog({ type: open ? 'OPEN_CREATE' : 'CLOSE_CREATE' })}
        onSubmit={handleCreateTemplate}
      />

      <OfferTemplateFormDialog
        open={!!editingTemplate}
        onOpenChange={(open) =>
          !open && dispatchDialog({ type: 'SET_EDITING', payload: undefined })
        }
        template={editingTemplate}
        onSubmit={handleUpdateTemplate}
      />

      <AlertDialog
        open={!!deletingTemplateId}
        onOpenChange={() => dispatchDialog({ type: 'SET_DELETING', payload: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten szablon?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Szablon zostanie trwale usunięty z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
