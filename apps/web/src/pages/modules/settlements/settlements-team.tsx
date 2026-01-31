import { useCallback, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, CheckCircle, Clock, TrendingUp, UserPlus, Users } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
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
import { useEmployees } from '@/lib/hooks/use-employees';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useBulkAssignSettlements,
  useEmployeeStats,
  useSettlements,
} from '@/lib/hooks/use-settlements';

import { MonthSelector } from './components/month-selector';

export default function SettlementsTeamPage() {
  const navigate = useNavigate();
  const basePath = useModuleBasePath('settlements');

  // Month/year state
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  // Bulk assignment state
  const [selectedSettlements, setSelectedSettlements] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');

  // Fetch data
  const { data: employeeStatsData, isPending: statsPending } = useEmployeeStats(month, year);
  const employeeStats = employeeStatsData?.employees ?? [];

  const { data: unassignedResponse, isPending: unassignedPending } = useSettlements({
    month,
    year,
    unassigned: true,
    limit: 100,
  });
  const unassignedSettlements = useMemo(
    () => unassignedResponse?.data ?? [],
    [unassignedResponse?.data]
  );

  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse?.data ?? [];

  const bulkAssign = useBulkAssignSettlements();

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

  const getEmployeeName = (employee: { firstName?: string; lastName?: string; email: string }) => {
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return employee.email;
  };

  // Employee stats columns
  const statsColumns: ColumnDef<EmployeeStatsDto>[] = useMemo(
    () => [
      {
        accessorKey: 'email',
        header: 'Pracownik',
        cell: ({ row }) => {
          const stat = row.original;
          return (
            <div className="flex flex-col">
              <span className="text-apptax-navy font-medium">
                {stat.firstName && stat.lastName
                  ? `${stat.firstName} ${stat.lastName}`
                  : stat.email}
              </span>
              {stat.firstName && stat.lastName && (
                <span className="text-muted-foreground text-xs">{stat.email}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'total',
        header: 'Razem',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.original.total}
          </Badge>
        ),
      },
      {
        accessorKey: 'pending',
        header: 'Oczekujące',
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {row.original.pending}
          </Badge>
        ),
      },
      {
        accessorKey: 'inProgress',
        header: 'W trakcie',
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {row.original.inProgress}
          </Badge>
        ),
      },
      {
        accessorKey: 'completed',
        header: 'Zakończone',
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {row.original.completed}
          </Badge>
        ),
      },
      {
        accessorKey: 'completionRate',
        header: 'Realizacja',
        cell: ({ row }) => {
          const rate = Math.round(row.original.completionRate * 100);
          return (
            <div className="flex items-center gap-2">
              <div className="h-2 w-16 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-apptax-teal" style={{ width: `${rate}%` }} />
              </div>
              <span className="text-sm font-medium">{rate}%</span>
            </div>
          );
        },
      },
    ],
    []
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
            <DataTable columns={statsColumns} data={employeeStats} />
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

              {/* Settlement Selection List */}
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

                {/* Settlement List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {unassignedSettlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex items-center gap-3 border-b last:border-b-0 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        id={settlement.id}
                        checked={selectedSettlements.includes(settlement.id)}
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
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
