import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, BarChart3 } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { RankedListCard } from '@/components/dashboard/ranked-list-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useEmployeeTimeBreakdown,
  useTopSettlementsByTime,
  useTopTasksByTime,
} from '@/lib/hooks/use-time-tracking';

export default function TimeTrackingStatisticsPage() {
  const navigate = useNavigate();
  const basePath = useModuleBasePath('time-tracking');
  const [preset, setPreset] = useState<'30d' | '90d' | '365d'>('30d');

  const { data: topTasks, isPending: topTasksLoading } = useTopTasksByTime(preset);
  const { data: topSettlements, isPending: topSettlementsLoading } =
    useTopSettlementsByTime(preset);
  const { data: employeeBreakdown, isPending: employeeBreakdownLoading } =
    useEmployeeTimeBreakdown(preset);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Statystyki logowania czasu"
        description="Rozszerzone statystyki i rankingi czasu pracy"
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Okres:</span>
        {(['30d', '90d', '365d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {p === '30d' ? '30 dni' : p === '90d' ? '90 dni' : 'Rok'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Top Tasks by Time */}
        <RankedListCard
          title="Najdłuższe zadania (czas)"
          isPending={topTasksLoading}
          items={topTasks?.map(
            (item: {
              taskId: string;
              taskTitle: string;
              totalMinutes: number;
              totalHours: number;
            }) => ({
              key: item.taskId,
              label: item.taskTitle,
              value: `${item.totalHours}h`,
            })
          )}
          limit={10}
          valueClassName="text-muted-foreground ml-2 shrink-0"
          className="border-border"
        />

        {/* Top Settlements by Time */}
        <RankedListCard
          title="Najdłuższe rozliczenia (czas)"
          isPending={topSettlementsLoading}
          items={topSettlements?.map(
            (item: {
              settlementId: string;
              month: number;
              year: number;
              clientName?: string;
              totalMinutes: number;
              totalHours: number;
            }) => ({
              key: item.settlementId,
              label: item.clientName
                ? `${item.clientName} (${item.month}/${item.year})`
                : `${item.month}/${item.year}`,
              value: `${item.totalHours}h`,
            })
          )}
          limit={10}
          valueClassName="text-muted-foreground ml-2 shrink-0"
          className="border-border"
        />

        {/* Employee Time Breakdown */}
        <Card className="border-border md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Czas pracowników</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeBreakdownLoading ? (
              <p className="text-muted-foreground text-sm">Ładowanie...</p>
            ) : !employeeBreakdown || employeeBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak danych</p>
            ) : (
              <div className="space-y-3">
                {employeeBreakdown
                  .slice(0, 8)
                  .map(
                    (item: {
                      userId: string;
                      email: string;
                      firstName?: string;
                      lastName?: string;
                      taskMinutes: number;
                      settlementMinutes: number;
                      totalMinutes: number;
                    }) => {
                      const name =
                        item.firstName || item.lastName
                          ? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
                          : item.email;
                      const taskHours = Math.round(item.taskMinutes / 6) / 10;
                      const settlementHours = Math.round(item.settlementMinutes / 6) / 10;
                      return (
                        <div key={item.userId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className="text-foreground max-w-[60%] truncate font-medium"
                              title={item.email}
                            >
                              {name}
                            </span>
                            <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                              {Math.round(item.totalMinutes / 6) / 10}h łącznie
                            </span>
                          </div>
                          <div className="text-muted-foreground flex gap-3 text-xs">
                            <span>Zadania: {taskHours}h</span>
                            <span>Rozlicz.: {settlementHours}h</span>
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
