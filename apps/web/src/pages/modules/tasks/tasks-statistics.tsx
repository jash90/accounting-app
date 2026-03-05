import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, BarChart3 } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { RankedListCard } from '@/components/dashboard/ranked-list-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useEmployeeTaskRanking,
  useTaskCompletionStats,
  useTaskStatusDuration,
} from '@/lib/hooks/use-tasks';

type PeriodPreset = '30d' | '90d' | '365d' | 'all';

function usePresetFilters(preset: PeriodPreset) {
  if (preset === 'all') return undefined;
  const days = preset === '30d' ? 30 : preset === '90d' ? 90 : 365;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { startDate };
}

export default function TasksStatisticsPage() {
  const navigate = useNavigate();
  const basePath = useModuleBasePath('tasks');

  const [period, setPeriod] = useState<PeriodPreset>('all');
  const filters = usePresetFilters(period);

  const { data: rankingData, isPending: rankingPending } = useEmployeeTaskRanking(filters);
  const { data: durationData, isPending: durationPending } = useTaskCompletionStats(filters);
  const { data: blockedData, isPending: blockedPending } = useTaskStatusDuration(
    'blocked',
    filters
  );
  const { data: cancelledData, isPending: cancelledPending } = useTaskStatusDuration(
    'cancelled',
    filters
  );
  const { data: inReviewData, isPending: inReviewPending } = useTaskStatusDuration(
    'in_review',
    filters
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Statystyki zadań"
          description="Rozszerzone statystyki i rankingi zadań"
          icon={<BarChart3 className="h-6 w-6" />}
        />
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cały okres</SelectItem>
            <SelectItem value="30d">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90d">Ostatnie 90 dni</SelectItem>
            <SelectItem value="365d">Ostatnie 365 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankedListCard
          title="Ranking pracowników — ukończone zadania"
          isPending={rankingPending}
          items={rankingData?.rankings?.map(
            (
              r: {
                userId: string;
                firstName?: string;
                lastName?: string;
                email: string;
                completedCount: number;
              },
              i: number
            ) => ({
              key: r.userId,
              label: `${i + 1}. ${r.firstName ?? ''} ${r.lastName ?? r.email}`.trim(),
              value: r.completedCount,
            })
          )}
          limit={10}
        />

        <RankedListCard
          title="Pracownicy z najmniejszą liczbą ukończonych zadań"
          isPending={rankingPending}
          items={rankingData?.rankings
            ?.slice()
            .reverse()
            .map(
              (
                r: {
                  userId: string;
                  firstName?: string;
                  lastName?: string;
                  email: string;
                  completedCount: number;
                },
                i: number
              ) => ({
                key: `bottom-${r.userId}`,
                label: `${i + 1}. ${r.firstName ?? ''} ${r.lastName ?? r.email}`.trim(),
                value: r.completedCount,
              })
            )}
          limit={10}
        />

        <RankedListCard
          title="Najdłuższe zadania (godz.)"
          isPending={durationPending}
          items={durationData?.longest?.map(
            (t: { id: string; title: string; durationHours: number }) => ({
              key: t.id,
              label: t.title,
              value: `${t.durationHours}h`,
            })
          )}
          limit={10}
          footer={
            durationData?.averageDurationHours != null ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Średnia: {durationData.averageDurationHours}h
              </p>
            ) : null
          }
        />

        <RankedListCard
          title="Najdłużej zablokowane zadania"
          isPending={blockedPending}
          items={blockedData?.longest?.map(
            (t: { id: string; title: string; durationHours: number }) => ({
              key: t.id,
              label: t.title,
              value: `${t.durationHours}h`,
            })
          )}
          limit={10}
          footer={
            blockedData?.averageDurationHours != null ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Średnia: {blockedData.averageDurationHours}h
              </p>
            ) : null
          }
        />

        <RankedListCard
          title="Najdłużej anulowane zadania"
          isPending={cancelledPending}
          items={cancelledData?.longest?.map(
            (t: { id: string; title: string; durationHours: number }) => ({
              key: t.id,
              label: t.title,
              value: `${t.durationHours}h`,
            })
          )}
          limit={10}
          footer={
            cancelledData?.averageDurationHours != null ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Średnia: {cancelledData.averageDurationHours}h
              </p>
            ) : null
          }
        />

        <RankedListCard
          title="Najdłużej w przeglądzie"
          isPending={inReviewPending}
          items={inReviewData?.longest?.map(
            (t: { id: string; title: string; durationHours: number }) => ({
              key: t.id,
              label: t.title,
              value: `${t.durationHours}h`,
            })
          )}
          limit={10}
          footer={
            inReviewData?.averageDurationHours != null ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Średnia: {inReviewData.averageDurationHours}h
              </p>
            ) : null
          }
        />
      </div>
    </div>
  );
}
