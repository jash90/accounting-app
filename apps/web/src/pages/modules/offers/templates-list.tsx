import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Download,
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
import { useAuthContext } from '@/contexts/auth-context';
import {
  useCreateOfferTemplate,
  useDeleteOfferTemplate,
  useDownloadOfferTemplateFile,
  useOfferTemplates,
  useUpdateOfferTemplate,
  useUploadOfferTemplateFile,
} from '@/lib/hooks/use-offers';
import { type OfferTemplateFiltersDto, type OfferTemplateResponseDto } from '@/types/dtos';
import { UserRole } from '@/types/enums';

export default function TemplatesListPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [filters, setFilters] = useState<OfferTemplateFiltersDto>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OfferTemplateResponseDto | undefined>();
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const { data, isPending, refetch } = useOfferTemplates(filters);
  const templates = data?.data ?? [];

  const createMutation = useCreateOfferTemplate();
  const updateMutation = useUpdateOfferTemplate();
  const deleteMutation = useDeleteOfferTemplate();
  const uploadFileMutation = useUploadOfferTemplateFile();
  const downloadFileMutation = useDownloadOfferTemplateFile();

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/offers';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/offers';
      default:
        return '/modules/offers';
    }
  };

  const basePath = getBasePath();

  const handleFileUpload = async (template: OfferTemplateResponseDto) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.doc';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await uploadFileMutation.mutateAsync({ id: template.id, file });
        refetch();
      }
    };
    input.click();
  };

  const handleFileDownload = async (template: OfferTemplateResponseDto) => {
    if (!template.templateFileName) return;
    await downloadFileMutation.mutateAsync({
      id: template.id,
      filename: template.templateFileName,
    });
  };

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
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
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
                  onClick={() => setDeletingTemplateId(template.id)}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const handleCreateTemplate = async (data: unknown) => {
    await createMutation.mutateAsync(data as Parameters<typeof createMutation.mutateAsync>[0]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateTemplate = async (data: unknown) => {
    if (!editingTemplate) return;
    await updateMutation.mutateAsync({
      id: editingTemplate.id,
      data: data as Parameters<typeof updateMutation.mutateAsync>[0]['data'],
    });
    setEditingTemplate(undefined);
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplateId) return;
    await deleteMutation.mutateAsync(deletingTemplateId);
    setDeletingTemplateId(null);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(basePath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-apptax-navy text-2xl font-bold">Szablony ofert</h1>
            <p className="text-muted-foreground">Zarządzaj szablonami dokumentów ofertowych</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-apptax-blue hover:bg-apptax-blue/90"
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
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
          Wyświetlono {templates.length} z {data.total} szablonów
        </div>
      )}

      {/* Dialogs */}
      <OfferTemplateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTemplate}
      />

      <OfferTemplateFormDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(undefined)}
        template={editingTemplate}
        onSubmit={handleUpdateTemplate}
      />

      <AlertDialog open={!!deletingTemplateId} onOpenChange={() => setDeletingTemplateId(null)}>
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
