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
const SKELETON_KEYS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

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
  /**
   * Server-side pagination support. When `totalCount` is provided the table
   * stops doing client-side slicing and assumes `data` is already a single
   * page. The pagination footer renders the real total and the Next/Prev
   * buttons call `onPageChange(zeroBasedPageIndex)` instead of mutating the
   * internal table state.
   *
   * - `totalCount`   — full record count from the server (e.g. `meta.total`)
   * - `pageIndex`    — zero-based index of the current page (controlled)
   * - `onPageChange` — called when the user clicks Prev / Next
   *
   * When all three are omitted the table falls back to client-side
   * pagination over `data`, which is the original behavior. Mixed-mode
   * (e.g. providing only `totalCount`) is treated as server-side.
   */
  totalCount?: number;
  pageIndex?: number;
  onPageChange?: (pageIndex: number) => void;
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
  totalCount,
  pageIndex,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  'use no memo';
  // The directive above MUST be the first statement in the function
  // body — the React Compiler only honors `'use no memo'` when it's at
  // the top of a function. Putting any code (variable declaration,
  // expression) before it silently turns the directive into a no-op.
  const isServerPagination = typeof totalCount === 'number';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Memoize selected row IDs for efficient comparison
  const selectedRowIds = useMemo(() => {
    if (!getRowId) return new Set<string>();
    return new Set(selectedRows.map((row) => getRowId(row)));
  }, [selectedRows, getRowId]);

  // Derive row selection state during render (not in useEffect) — avoids
  // an extra render cycle and keeps state in sync with the parent.
  //
  // IMPORTANT: When `getRowId` is set on the TanStack table, the row
  // selection state is keyed by **row ID** (e.g. UUID), not by row index.
  // The previous implementation built an index-keyed state which TanStack
  // then ignored — clicking a row checkbox toggled internal state but
  // `onSelectionChange` (which looked up `data[parseInt(key)]`) received
  // an empty array because `parseInt("uuid-…")` is `NaN`. Result: master
  // checkbox worked (it goes through `toggleAllPageRowsSelected`), but
  // individual row clicks never propagated.
  const rowSelection = useMemo(() => {
    if (!selectable) return internalRowSelection;
    if (!getRowId) return internalRowSelection;
    const newSelection: RowSelectionState = {};
    for (const row of data) {
      const rowId = getRowId(row);
      if (selectedRowIds.has(rowId)) {
        newSelection[rowId] = true;
      }
    }
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
    // In server-pagination mode we deliberately skip the client-side
    // pagination row model — `data` is already a single page, so slicing
    // it again would chop it down to zero rows.
    getPaginationRowModel:
      enablePagination && !isServerPagination ? getPaginationRowModel() : undefined,
    manualPagination: isServerPagination,
    pageCount: isServerPagination
      ? Math.max(1, Math.ceil((totalCount ?? 0) / pageSize))
      : undefined,
    rowCount: isServerPagination ? totalCount : undefined,
    onSortingChange: setSorting,
    onRowSelectionChange: (updaterOrValue) => {
      const newSelection =
        typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;

      setInternalRowSelection(newSelection);

      // Resolve selection keys → row data. When `getRowId` is provided the
      // keys are row IDs (UUIDs); without it, TanStack falls back to
      // numeric indexes. Handle both — the previous code unconditionally
      // did `parseInt(key)` and silently dropped UUID-keyed selections.
      if (onSelectionChange) {
        const keys = Object.keys(newSelection).filter((key) => newSelection[key]);
        let selectedRowData: TData[];
        if (getRowId) {
          const rowsById = new Map<string, TData>(data.map((row) => [getRowId(row), row]));
          selectedRowData = keys
            .map((key) => rowsById.get(key))
            .filter((r): r is TData => r != null);
        } else {
          selectedRowData = keys
            .map((key) => data[parseInt(key, 10)])
            .filter((r): r is TData => r != null);
        }
        onSelectionChange(selectedRowData);
      }
    },
    state: {
      sorting,
      rowSelection: selectable ? rowSelection : {},
      columnVisibility: derivedColumnVisibility,
      ...(isServerPagination
        ? { pagination: { pageIndex: pageIndex ?? 0, pageSize } }
        : {}),
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
        {SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="bg-accent/10 h-12 w-full rounded-lg" />
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

      {enablePagination && data.length > 0 && (() => {
        // In server-pagination mode the parent owns `pageIndex` and the
        // total count comes from the API. In client mode we stick with
        // TanStack's internal state and the local `data` length.
        const currentPageIndex = isServerPagination
          ? (pageIndex ?? 0)
          : table.getState().pagination.pageIndex;
        const totalRows = isServerPagination ? (totalCount ?? 0) : data.length;
        const startRow = currentPageIndex * pageSize + 1;
        const endRow = Math.min((currentPageIndex + 1) * pageSize, totalRows);
        const canPrev = isServerPagination ? currentPageIndex > 0 : table.getCanPreviousPage();
        const canNext = isServerPagination
          ? endRow < totalRows
          : table.getCanNextPage();
        const handlePrev = () => {
          if (isServerPagination) {
            onPageChange?.(Math.max(0, currentPageIndex - 1));
          } else {
            table.previousPage();
          }
        };
        const handleNext = () => {
          if (isServerPagination) {
            onPageChange?.(currentPageIndex + 1);
          } else {
            table.nextPage();
          }
        };

        return (
          <div className="flex items-center justify-between px-2">
            <p className="text-muted-foreground text-sm">
              Wyświetlanie{' '}
              <span className="text-foreground font-medium">{startRow}</span>{' '}-{' '}
              <span className="text-foreground font-medium">{endRow}</span>{' '}
              z <span className="text-foreground font-medium">{totalRows}</span> wyników
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!canPrev}
                className="border-accent hover:bg-accent/20 hover:border-accent"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Poprzednia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canNext}
                className="border-accent hover:bg-accent/20 hover:border-accent"
              >
                Następna
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
