import { useMemo } from 'react';

import { useGlobalDashboard } from '@/lib/hooks/use-global-dashboard';
import { useCompanyModules } from '@/lib/hooks/use-permissions';

import { DashboardActivitySection } from './dashboard-activity-section';
import { DashboardChartsSection } from './dashboard-charts-section';
import { DashboardKPISection } from './dashboard-kpi-section';

interface GlobalDashboardProps {
  title: string;
  subtitle: string;
}

export function GlobalDashboard({ title, subtitle }: GlobalDashboardProps) {
  const { data: modules } = useCompanyModules();
  const enabledSlugs = useMemo(() => modules?.map((m) => m.slug) ?? [], [modules]);
  const dashboardData = useGlobalDashboard(enabledSlugs);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      </div>

      <DashboardKPISection data={dashboardData} enabledModules={enabledSlugs} />

      <DashboardChartsSection data={dashboardData} enabledModules={enabledSlugs} />

      <DashboardActivitySection data={dashboardData} enabledModules={enabledSlugs} />
    </div>
  );
}
