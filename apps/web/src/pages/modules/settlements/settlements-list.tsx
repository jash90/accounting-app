import { lazy, Suspense, useCallback, useMemo, useState, useTransition } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ArrowLeft, Calculator, PlayCircle, RefreshCcw } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import {
  type GetSettlementsQueryDto,
  type SettlementResponseDto,
  type SettlementStatus,
} from '@/lib/api/endpoints/settlements';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useInitializeMonth,
  useSettlements,
  useUpdateSettlementStatus,
} from '@/lib/hooks/use-settlements';
import { UserRole } from '@/types/enums';

import { createSettlementsListColumns } from './columns/settlements-list-columns';
import { FiltersPanel, type SettlementFilters } from './components/filters-panel';
import { MonthSelector } from './components/month-selector';
import { SettlementColumnsProvider } from './contexts/settlement-columns-context';

// Lazy-load DataTable for better initial bundle size
const LazyDataTable = lazy(() =>
  import('@/components/common/data-table').then((m) => ({
    default: m.DataTable as React.ComponentType<{
      columns: ColumnDef<SettlementResponseDto>[];
      data: SettlementResponseDto[];
      isLoading?: boolean;
    }>,
  }))
);

// Pre-allocated skeleton count to avoid array recreation
const TABLE_SKELETON_COUNT = 5;

// Table loading skeleton for Suspense fallback
function TableSkeleton() {
  return (
    <div className="space-y-3 p-4" role="status" aria-live="polite">
      <span className="sr-only">Ładowanie tabeli rozliczeń...</span>
      <div className="flex items-center justify-between border-b pb-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      {Array.from({ length: TABLE_SKELETON_COUNT }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

// Columns are now stable since they don't depend on isPending
const columns = createSettlementsListColumns();

// Error fallback component for settlements table
function SettlementsTableErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive/70" />
      <h3 className="mt-4 text-lg font-semibold">Nie udało się załadować rozliczeń</h3>
      <p className="text-muted-foreground mt-2 max-w-md">
        Wystąpił błąd podczas ładowania tabeli rozliczeń. Spróbuj odświeżyć stronę lub skontaktuj
        się z administratorem, jeśli problem będzie się powtarzał.
      </p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCcw className="h-4 w-4" />
          Spróbuj ponownie
        </button>
      ) : null}
    </div>
  );
}

export default function SettlementsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const basePath = useModuleBasePath('settlements');

  const { hasWritePermission, hasManagePermission } = useModulePermissions('settlements');

  // Check if user is owner or admin
  const isOwnerOrAdmin = user?.role === UserRole.COMPANY_OWNER || user?.role === UserRole.ADMIN;

  // Month/year state with transition for non-blocking UI updates
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [isMonthTransition, startMonthTransition] = useTransition();

  // Wrap month/year changes in startTransition for non-blocking UI
  // Note: setMonth and setYear are stable (from useState), but we include them
  // to satisfy the React Compiler's dependency inference
  const handleMonthChange = useCallback(
    (newMonth: number) => {
      startMonthTransition(() => setMonth(newMonth));
    },
    [setMonth]
  );

  const handleYearChange = useCallback(
    (newYear: number) => {
      startMonthTransition(() => setYear(newYear));
    },
    [setYear]
  );

  // Filters state
  const [filters, setFilters] = useState<SettlementFilters>({});

  // Build query
  const query: GetSettlementsQueryDto = useMemo(
    () => ({
      month,
      year,
      ...filters,
    }),
    [month, year, filters]
  );

  // Data fetching
  const { data: settlementsResponse, isPending } = useSettlements(query);
  const settlements = settlementsResponse?.data ?? [];

  // Mutations
  const updateStatus = useUpdateSettlementStatus();
  const initializeMonth = useInitializeMonth();

  // Handlers
  const handleStatusChange = useCallback(
    (settlementId: string, newStatus: SettlementStatus) => {
      updateStatus.mutate({
        id: settlementId,
        data: { status: newStatus },
      });
    },
    [updateStatus]
  );

  const handleInitializeMonth = useCallback(() => {
    initializeMonth.mutate(
      { month, year },
      {
        onSuccess: (result) => {
          toast({
            title: 'Miesiąc zainicjalizowany',
            description: `Utworzono ${result.created} rozliczeń, pominięto ${result.skipped}`,
          });
        },
      }
    );
  }, [initializeMonth, month, year, toast]);

  // Use transition for filter changes to keep UI responsive during re-renders
  const [, startFilterTransition] = useTransition();

  // Support both direct value and functional update patterns for FiltersPanel
  const handleFiltersChange = useCallback(
    (newFilters: SettlementFilters | ((prev: SettlementFilters) => SettlementFilters)) => {
      startFilterTransition(() => {
        if (typeof newFilters === 'function') {
          setFilters(newFilters);
        } else {
          setFilters(newFilters);
        }
      });
    },
    []
  );

  // Navigation handlers for columns
  const handleNavigateToComments = useCallback(
    (settlementId: string) => navigate(`${basePath}/${settlementId}/comments`),
    [basePath, navigate]
  );

  const handleNavigateToAssign = useCallback(
    (settlementId: string) => navigate(`${basePath}/${settlementId}/assign`),
    [basePath, navigate]
  );

  // Context value for column cell components
  // This allows cells to read isPending from context instead of having it as a column dependency
  const columnsContextValue = useMemo(
    () => ({
      hasWritePermission,
      hasManagePermission,
      onStatusChange: handleStatusChange,
      onNavigateToComments: handleNavigateToComments,
      onNavigateToAssign: handleNavigateToAssign,
      isStatusUpdatePending: updateStatus.isPending,
    }),
    [
      hasWritePermission,
      hasManagePermission,
      handleStatusChange,
      handleNavigateToComments,
      handleNavigateToAssign,
      updateStatus.isPending,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Rozliczenia"
        description="Lista rozliczeń klientów za wybrany miesiąc"
        icon={<Calculator className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-4">
            <MonthSelector
              month={month}
              year={year}
              onMonthChange={handleMonthChange}
              onYearChange={handleYearChange}
            />
            {hasManagePermission ? (
              <Button
                onClick={handleInitializeMonth}
                disabled={initializeMonth.isPending || isMonthTransition}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {initializeMonth.isPending ? 'Inicjalizacja...' : 'Zainicjalizuj miesiąc'}
              </Button>
            ) : null}
          </div>
        }
      />

      <FiltersPanel
        filters={filters}
        onChange={handleFiltersChange}
        showEmployeeFilter={isOwnerOrAdmin}
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <SettlementColumnsProvider value={columnsContextValue}>
            <ErrorBoundary
              fallback={<SettlementsTableErrorFallback />}
              resetKeys={[location.pathname, month, year]}
            >
              <Suspense fallback={<TableSkeleton />}>
                <LazyDataTable
                  columns={columns}
                  data={settlements}
                  isLoading={isPending || isMonthTransition}
                />
              </Suspense>
            </ErrorBoundary>
          </SettlementColumnsProvider>
        </CardContent>
      </Card>
    </div>
  );
}
