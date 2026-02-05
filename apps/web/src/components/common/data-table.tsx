import { memo, useMemo, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
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

// Hoisted empty array to prevent re-renders from new reference creation
const EMPTY_SELECTED_ROWS: never[] = [];

// Hoisted style constant to prevent re-renders from new reference creation
const TABLE_ROW_STYLE = {
  contentVisibility: 'auto',
  containIntrinsicSize: '0 48px',
} as const;

// Pre-allocated skeleton count to avoid array recreation
const SKELETON_COUNT = 5;

/**
 * Generic data table component with sorting, pagination, and row selection.
 *
 * @remarks
 * **Performance Note:** The `columns` prop should be memoized with `useMemo` in the parent
 * component to prevent unnecessary re-renders of the entire table. Column definitions that
 * change on every render will cause the internal `allColumns` memoization to recalculate,
 * leading to performance degradation.
 *
 * @example
 * ```tsx
 * // Good - columns are memoized
 * const columns = useMemo(() => createColumns(), []);
 * return <DataTable columns={columns} data={data} />;
 *
 * // Bad - columns recreated every render
 * return <DataTable columns={createColumns()} data={data} />;
 * ```
 */
interface DataTableProps<TData, TValue> {
  /** Column definitions - MUST be memoized with useMemo in parent component */
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

function DataTableInner<TData, TValue>({
  columns,
  data,
  isLoading = false,
  onRowClick,
  enableSorting = true,
  enablePagination = true,
  pageSize = 20,
  selectable = false,
  selectedRows = EMPTY_SELECTED_ROWS as TData[],
  onSelectionChange,
  getRowId,
  columnVisibility: visibleColumnIds,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Memoize selected row IDs for efficient comparison
  const selectedRowIds = useMemo(() => {
    if (!getRowId) return new Set<string>();
    return new Set(selectedRows.map((row) => getRowId(row)));
  }, [selectedRows, getRowId]);

  // Derive row selection state during render (not in useEffect)
  // This avoids an extra render cycle and keeps state in sync
  const rowSelection = useMemo(() => {
    if (!selectable || !getRowId) return internalRowSelection;
    const newSelection: RowSelectionState = {};
    data.forEach((row, index) => {
      const rowId = getRowId(row);
      if (selectedRowIds.has(rowId)) {
        newSelection[index] = true;
      }
    });
    return newSelection;
  }, [selectedRowIds, data, selectable, getRowId, internalRowSelection]);

  // Derive columnVisibility from props during render
  const derivedColumnVisibility = useMemo(() => {
    if (!visibleColumnIds) return columnVisibility;
    const newVisibility: VisibilityState = {};
    columns.forEach((col) => {
      const colId = col.id || ('accessorKey' in col ? String(col.accessorKey) : undefined);
      if (colId) {
        newVisibility[colId] = visibleColumnIds.includes(colId);
      }
    });
    return newVisibility;
  }, [visibleColumnIds, columns, columnVisibility]);

  // Memoize columns with selection column to prevent recreation on every render
  const allColumns = useMemo((): ColumnDef<TData, TValue>[] => {
    if (!selectable) return columns;

    return [
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
    ];
  }, [selectable, columns]);

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

      setInternalRowSelection(newSelection);

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
      columnVisibility: derivedColumnVisibility,
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
      <div className="space-y-3 p-4" role="status" aria-busy="true">
        <span className="sr-only">Ładowanie danych tabeli...</span>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <Skeleton key={i} className="bg-accent/10 h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {selectable && selectedCount > 0 && (
        <div className="bg-accent/10 rounded-lg px-4 py-2">
          <p className="text-foreground text-sm">
            Zaznaczono <span className="font-semibold">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'element' : selectedCount < 5 ? 'elementy' : 'elementów'}
          </p>
        </div>
      )}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className="text-foreground font-semibold"
                    aria-sort={
                      sortDirection === 'asc'
                        ? 'ascending'
                        : sortDirection === 'desc'
                          ? 'descending'
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
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
                className={`hover:bg-accent/10 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${row.getIsSelected() ? 'bg-accent/10' : ''}`}
                style={TABLE_ROW_STYLE}
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
          <p className="text-muted-foreground text-sm">
            Wyświetlanie{' '}
            <span className="text-foreground font-medium">
              {table.getState().pagination.pageIndex * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="text-foreground font-medium">
              {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)}
            </span>{' '}
            z <span className="text-foreground font-medium">{data.length}</span> wyników
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-accent hover:bg-accent/20 hover:border-accent"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-accent hover:bg-accent/20 hover:border-accent"
            >
              Następna
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
