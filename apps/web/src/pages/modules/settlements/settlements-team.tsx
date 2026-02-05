import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowLeft, CheckCircle, Clock, TrendingUp, UserPlus, Users } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { type EmployeeStatsDto } from '@/lib/api/endpoints/settlements';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useAllAssignableUsers,
  useBulkAssignSettlements,
  useTeamPageData,
} from '@/lib/hooks/use-settlements';
import { getEmployeeName } from '@/lib/utils/user';

import { employeeStatsColumns } from './columns/employee-stats-columns';
import { MonthSelector } from './components/month-selector';

// Lazy-load DataTable for better initial bundle size
const LazyDataTable = lazy(() =>
  import('@/components/common/data-table').then((m) => ({
    default: m.DataTable as React.ComponentType<{
      columns: ColumnDef<EmployeeStatsDto>[];
      data: EmployeeStatsDto[];
      isLoading?: boolean;
    }>,
  }))
);

// Pre-allocated constant for skeleton indices - prevents array creation on each render
const SKELETON_INDICES = [0, 1, 2] as const;

// Table loading skeleton for Suspense fallback
function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {SKELETON_INDICES.map((i) => (
        <div key={i} className="bg-accent/10 h-12 w-full animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

// Row height for virtualization calculation
const SETTLEMENT_ROW_HEIGHT = 56;

// Error fallback component for employee stats table
function EmployeeStatsErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Users className="mx-auto h-12 w-12 text-destructive/50" />
      <p className="text-muted-foreground mt-2">Nie udało się załadować statystyk pracowników</p>
    </div>
  );
}

export default function SettlementsTeamPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useModuleBasePath('settlements');

  // Month/year state
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  // Bulk assignment state
  const [selectedSettlements, setSelectedSettlements] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');

  // Ref for virtualized list container
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Fetch data in parallel using useQueries for better performance
  // This reduces 2 sequential network requests to 1 parallel batch (30-50ms faster)
  const [employeeStatsQuery, unassignedQuery] = useTeamPageData(month, year);

  const statsPending = employeeStatsQuery.isPending;
  const employeeStats = employeeStatsQuery.data?.employees ?? [];

  const unassignedPending = unassignedQuery.isPending;
  // Memoize for stable reference - required for useCallback dependencies (line 150)
  const unassignedSettlements = useMemo(
    () => unassignedQuery.data?.data ?? [],
    [unassignedQuery.data?.data]
  );

  const { data: assignableUsers } = useAllAssignableUsers();
  const employees = assignableUsers ?? [];

  const bulkAssign = useBulkAssignSettlements(month, year);

  // Memoize Set for O(1) lookup instead of Array.includes O(n)
  const selectedSet = useMemo(() => new Set(selectedSettlements), [selectedSettlements]);

  // Virtualizer for settlement list - only render visible items for performance
  const virtualizer = useVirtualizer({
    count: unassignedSettlements.length,
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => SETTLEMENT_ROW_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
  });

  // Handlers
  const handleBulkAssign = useCallback(() => {
    if (selectedSettlements.length === 0 || !targetUserId) return;

    bulkAssign.mutate(
      {
        settlementIds: selectedSettlements,
        userId: targetUserId,
      },
      {
        onSuccess: () => {
          setSelectedSettlements([]);
          setTargetUserId('');
        },
      }
    );
  }, [bulkAssign, selectedSettlements, targetUserId]);

  const toggleSettlement = useCallback((settlementId: string) => {
    setSelectedSettlements((prev) =>
      prev.includes(settlementId)
        ? prev.filter((id) => id !== settlementId)
        : [...prev, settlementId]
    );
  }, []);

  const toggleAllSettlements = useCallback(() => {
    if (selectedSettlements.length === unassignedSettlements.length) {
      setSelectedSettlements([]);
    } else {
      setSelectedSettlements(unassignedSettlements.map((s) => s.id));
    }
  }, [selectedSettlements.length, unassignedSettlements]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Zarządzanie zespołem"
        description="Statystyki pracowników i masowe przypisywanie rozliczeń"
        icon={<Users className="h-6 w-6" />}
        action={
          <MonthSelector
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        }
      />

      {/* Employee Statistics */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-apptax-teal" />
            <CardTitle className="text-lg">Statystyki pracowników</CardTitle>
          </div>
          <CardDescription>
            Podsumowanie rozliczeń przypisanych do pracowników w wybranym miesiącu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsPending ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employeeStats.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-2">Brak danych dla wybranego miesiąca</p>
            </div>
          ) : (
            <ErrorBoundary
              fallback={<EmployeeStatsErrorFallback />}
              resetKeys={[location.pathname, month, year]}
            >
              <Suspense fallback={<TableSkeleton />}>
                <LazyDataTable columns={employeeStatsColumns} data={employeeStats} />
              </Suspense>
            </ErrorBoundary>
          )}
        </CardContent>
      </Card>

      {/* Bulk Assignment Section */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-apptax-blue" />
            <CardTitle className="text-lg">Masowe przypisywanie</CardTitle>
          </div>
          <CardDescription>
            Wybierz nieprzypisane rozliczenia i przypisz je do pracownika
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unassignedPending ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : unassignedSettlements.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-muted-foreground mt-2">
                Wszystkie rozliczenia w tym miesiącu są przypisane
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Target Employee Selection */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px]">
                  <Label className="mb-2 block text-sm">Przypisz do pracownika</Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz pracownika" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {getEmployeeName(employee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleBulkAssign}
                  disabled={
                    selectedSettlements.length === 0 || !targetUserId || bulkAssign.isPending
                  }
                  className="bg-apptax-blue hover:bg-apptax-blue/90"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {bulkAssign.isPending
                    ? 'Przypisywanie...'
                    : `Przypisz wybrane (${selectedSettlements.length})`}
                </Button>
              </div>

              {/* Settlement Selection List - Virtualized for performance */}
              <div className="rounded-lg border">
                {/* Header */}
                <div className="flex items-center gap-3 border-b bg-muted/50 p-3">
                  <Checkbox
                    id="select-all"
                    checked={
                      selectedSettlements.length === unassignedSettlements.length &&
                      unassignedSettlements.length > 0
                    }
                    onCheckedChange={toggleAllSettlements}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                    Zaznacz wszystkie ({unassignedSettlements.length})
                  </Label>
                </div>

                {/* Virtualized Settlement List */}
                <div
                  ref={listContainerRef}
                  className="max-h-[400px] overflow-y-auto"
                  style={{ contain: 'strict' }}
                >
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {/* Virtualizer handles ref internally - no need for conditional check */}
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const settlement = unassignedSettlements[virtualItem.index];
                      const isSelected = selectedSet.has(settlement.id);

                      return (
                        <div
                          key={settlement.id}
                          data-index={virtualItem.index}
                          ref={virtualizer.measureElement}
                          className="absolute left-0 top-0 flex w-full items-center gap-3 border-b p-3 transition-colors hover:bg-muted/30"
                          style={{
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <Checkbox
                            id={settlement.id}
                            checked={isSelected}
                            onCheckedChange={() => toggleSettlement(settlement.id)}
                          />
                          <Label
                            htmlFor={settlement.id}
                            className="flex flex-1 cursor-pointer items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="text-apptax-navy font-medium">
                                {settlement.client?.name ?? 'Nieznany klient'}
                              </span>
                              {settlement.client?.nip && (
                                <span className="text-muted-foreground text-xs">
                                  NIP: {settlement.client.nip}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="mr-1 h-3 w-3" />
                                {settlement.invoiceCount} faktur
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
