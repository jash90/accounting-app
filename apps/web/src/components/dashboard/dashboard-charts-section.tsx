import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type GlobalDashboardData } from '@/lib/hooks/use-global-dashboard';

import { LeadFunnelChart } from './charts/lead-funnel-chart';
import { OfferPipelineChart } from './charts/offer-pipeline-chart';
import { SettlementsStatusChart } from './charts/settlements-status-chart';
import { TimeTrackedChart } from './charts/time-tracked-chart';

interface DashboardChartsSectionProps {
  data: GlobalDashboardData;
  enabledModules: string[];
}

export function DashboardChartsSection({ data, enabledModules }: DashboardChartsSectionProps) {
  const hasModule = (slug: string) => enabledModules.includes(slug);

  const hasAnyChart = hasModule('settlements') || hasModule('offers') || hasModule('time-tracking');

  if (!hasAnyChart) return null;

  const visibleCharts = [
    hasModule('settlements') && !!data.settlementStats,
    hasModule('offers') && !!data.offerStats,
    hasModule('offers') && !!data.leadStats,
    hasModule('time-tracking') && !!data.timeStats,
  ].filter(Boolean).length;

  return (
    <div className={`grid grid-cols-1 gap-6 ${visibleCharts > 1 ? 'lg:grid-cols-2' : ''}`}>
      {hasModule('settlements') && data.settlementStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status rozliczeń</CardTitle>
          </CardHeader>
          <CardContent>
            <SettlementsStatusChart
              pending={data.settlementStats.pending}
              inProgress={data.settlementStats.inProgress}
              completed={data.settlementStats.completed}
            />
          </CardContent>
        </Card>
      )}

      {hasModule('offers') && data.offerStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline ofert</CardTitle>
          </CardHeader>
          <CardContent>
            <OfferPipelineChart
              draftCount={data.offerStats.draftCount}
              readyCount={data.offerStats.readyCount}
              sentCount={data.offerStats.sentCount}
              acceptedCount={data.offerStats.acceptedCount}
              rejectedCount={data.offerStats.rejectedCount}
              expiredCount={data.offerStats.expiredCount}
            />
          </CardContent>
        </Card>
      )}

      {hasModule('offers') && data.leadStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lejek leadów</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadFunnelChart
              newCount={data.leadStats.newCount}
              contactedCount={data.leadStats.contactedCount}
              qualifiedCount={data.leadStats.qualifiedCount}
              proposalSentCount={data.leadStats.proposalSentCount}
              negotiationCount={data.leadStats.negotiationCount}
              convertedCount={data.leadStats.convertedCount}
              lostCount={data.leadStats.lostCount}
            />
          </CardContent>
        </Card>
      )}

      {hasModule('time-tracking') && data.timeStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Czas w bieżącym miesiącu</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeTrackedChart
              totalMinutes={data.timeStats.totalMinutes}
              billableMinutes={data.timeStats.billableMinutes}
              nonBillableMinutes={data.timeStats.nonBillableMinutes}
              totalAmount={data.timeStats.totalAmount}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
