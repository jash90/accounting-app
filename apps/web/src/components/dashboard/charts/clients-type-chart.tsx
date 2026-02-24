import { Cell, Pie, PieChart } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface ClientsTypeChartProps {
  byEmploymentType: Record<string, number>;
  total: number;
}

const chartConfig = {
  'Dział. gosp.': { label: 'Działalność gospodarcza', color: 'hsl(var(--chart-1))' },
  'DG + Etat': { label: 'DG + Etat', color: 'hsl(var(--chart-2))' },
  'DG + Akcj.': { label: 'DG + Akcjonariusz', color: 'hsl(var(--chart-3))' },
  '1/2 et. < min.': { label: 'DG + 1/2 etatu (poniżej min.)', color: 'hsl(var(--chart-4))' },
  '1/2 et. > min.': { label: 'DG + 1/2 etatu (powyżej min.)', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

const TYPE_CONFIG = [
  {
    key: 'DG',
    label: 'Dział. gosp.',
    fullLabel: 'Działalność gospodarcza',
    color: 'hsl(var(--chart-1))',
  },
  { key: 'DG_ETAT', label: 'DG + Etat', fullLabel: 'DG + Etat', color: 'hsl(var(--chart-2))' },
  {
    key: 'DG_AKCJONARIUSZ',
    label: 'DG + Akcj.',
    fullLabel: 'DG + Akcjonariusz',
    color: 'hsl(var(--chart-3))',
  },
  {
    key: 'DG_HALF_TIME_BELOW_MIN',
    label: '1/2 et. < min.',
    fullLabel: 'DG + 1/2 etatu (poniżej min.)',
    color: 'hsl(var(--chart-4))',
  },
  {
    key: 'DG_HALF_TIME_ABOVE_MIN',
    label: '1/2 et. > min.',
    fullLabel: 'DG + 1/2 etatu (powyżej min.)',
    color: 'hsl(var(--chart-5))',
  },
];

export function ClientsTypeChart({ byEmploymentType, total }: ClientsTypeChartProps) {
  const allData = TYPE_CONFIG.map(({ key, label, fullLabel, color }) => ({
    name: label,
    fullLabel,
    value: byEmploymentType[key] ?? 0,
    color,
  }));

  const chartData = allData.filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-sm">
        Brak klientów
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
          Łącznie: {total} klientów
        </p>
        {TYPE_CONFIG.map(({ key, label, color }) => {
          const value = byEmploymentType[key] ?? 0;
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
