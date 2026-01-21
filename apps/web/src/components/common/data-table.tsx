import { useState, useEffect } from 'react';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  enableSorting?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  selectable?: boolean;
  selectedRows?: TData[];
  onSelectionChange?: (selectedRows: TData[]) => void;
  getRowId?: (row: TData) => string;
  columnVisibility?: string[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  onRowClick,
  enableSorting = true,
  enablePagination = true,
  pageSize = 20,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId,
  columnVisibility: visibleColumnIds,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Sync columnVisibility from props
  useEffect(() => {
    if (visibleColumnIds) {
      const newVisibility: VisibilityState = {};
      // Hide columns not in the visibleColumnIds list
      // Prefer col.id over col.accessorKey for consistent column identification
      columns.forEach((col) => {
        const colId = col.id || ('accessorKey' in col ? String(col.accessorKey) : undefined);
        if (colId) {
          newVisibility[colId] = visibleColumnIds.includes(colId);
        }
      });
      setColumnVisibility(newVisibility);
    }
  }, [visibleColumnIds, columns]);

  // Sync external selectedRows with internal selection state
  useEffect(() => {
    if (!selectable || !getRowId) return;

    const newSelection: RowSelectionState = {};
    selectedRows.forEach((row) => {
      const rowIndex = data.findIndex((d) => getRowId(d) === getRowId(row));
      if (rowIndex !== -1) {
        newSelection[rowIndex] = true;
      }
    });
    setRowSelection(newSelection);
  }, [selectedRows, data, selectable, getRowId]);

  // Build columns with selection column if selectable
  const allColumns: ColumnDef<TData, TValue>[] = selectable
    ? [
        {
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Zaznacz wszystko"
              onClick={(e) => e.stopPropagation()}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Zaznacz wiersz"
              onClick={(e) => e.stopPropagation()}
            />
          ),
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    onRowSelectionChange: (updaterOrValue) => {
      const newSelection =
        typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;

      setRowSelection(newSelection);

      // Call onSelectionChange with the actual row data
      if (onSelectionChange) {
        const selectedRowData = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key, 10)])
          .filter(Boolean);
        onSelectionChange(selectedRowData);
      }
    },
    state: {
      sorting,
      rowSelection: selectable ? rowSelection : {},
      columnVisibility: visibleColumnIds ? columnVisibility : {},
    },
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: selectable,
    initialState: {
      pagination: {
        pageSize,
      },
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg bg-apptax-soft-teal/30" />
        ))}
      </div>
    );
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {selectable && selectedCount > 0 && (
        <div className="px-4 py-2 bg-apptax-soft-teal/20 rounded-lg">
          <p className="text-sm text-apptax-navy">
            Zaznaczono <span className="font-semibold">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'element' : selectedCount < 5 ? 'elementy' : 'elementów'}
          </p>
        </div>
      )}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-apptax-navy/5 hover:bg-apptax-navy/5">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-apptax-navy font-semibold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                data-state={row.getIsSelected() && 'selected'}
                className={`hover:bg-apptax-soft-teal/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${row.getIsSelected() ? 'bg-apptax-soft-teal/20' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={allColumns.length} className="h-32 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-muted-foreground">Brak wyników</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {enablePagination && data.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Wyświetlanie{' '}
            <span className="font-medium text-apptax-navy">
              {table.getState().pagination.pageIndex * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-medium text-apptax-navy">
              {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)}
            </span>{' '}
            z <span className="font-medium text-apptax-navy">{data.length}</span> wyników
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-apptax-soft-teal hover:bg-apptax-soft-teal/50 hover:border-apptax-teal"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-apptax-soft-teal hover:bg-apptax-soft-teal/50 hover:border-apptax-teal"
            >
              Następna
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
