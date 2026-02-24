import { Cell, Pie, PieChart } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface TasksStatusChartProps {
  byStatus: Record<string, number>;
  total: number;
}

const chartConfig = {
  Backlog: { label: 'Backlog', color: 'hsl(var(--chart-5))' },
  'Do zrobienia': { label: 'Do zrobienia', color: 'hsl(var(--chart-4))' },
  'W trakcie': { label: 'W trakcie', color: 'hsl(var(--chart-1))' },
  Recenzja: { label: 'Recenzja', color: 'hsl(var(--chart-3))' },
  Ukończone: { label: 'Ukończone', color: 'hsl(var(--chart-2))' },
  Anulowane: { label: 'Anulowane', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig;

const STATUS_CONFIG = [
  { key: 'BACKLOG', label: 'Backlog', color: 'hsl(var(--chart-5))' },
  { key: 'TODO', label: 'Do zrobienia', color: 'hsl(var(--chart-4))' },
  { key: 'IN_PROGRESS', label: 'W trakcie', color: 'hsl(var(--chart-1))' },
  { key: 'IN_REVIEW', label: 'Recenzja', color: 'hsl(var(--chart-3))' },
  { key: 'DONE', label: 'Ukończone', color: 'hsl(var(--chart-2))' },
  { key: 'CANCELLED', label: 'Anulowane', color: 'hsl(var(--muted-foreground))' },
];

export function TasksStatusChart({ byStatus, total }: TasksStatusChartProps) {
  const allData = STATUS_CONFIG.map(({ key, label, color }) => ({
    name: label,
    value: byStatus[key] ?? 0,
    color,
  }));

  const chartData = allData.filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-sm">
        Brak zadań
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <ChartContainer config={chartConfig} className="h-[180px] w-[180px] shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={52}
            outerRadius={80}
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Łącznie: {total} zadań
        </p>
        {STATUS_CONFIG.map(({ key, label, color }) => {
          const value = byStatus[key] ?? 0;
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-sm font-semibold tabular-nums">{value}</span>
              <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
