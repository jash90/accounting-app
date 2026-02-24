import { Cell, Pie, PieChart } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface SettlementsStatusChartProps {
  pending: number;
  inProgress: number;
  missingInvoiceVerification?: number;
  missingInvoice?: number;
  completed: number;
}

const chartConfig = {
  Oczekujące: { label: 'Oczekujące', color: 'hsl(var(--chart-3))' },
  'W trakcie': { label: 'W trakcie', color: 'hsl(var(--chart-1))' },
  'Brak. weryfikacji faktury': { label: 'Brak. weryfikacji faktury', color: 'hsl(var(--chart-4))' },
  'Brakująca faktura': { label: 'Brakująca faktura', color: 'hsl(var(--chart-5))' },
  Zakończone: { label: 'Zakończone', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const ALL_STATUSES = [
  { name: 'Oczekujące', color: 'hsl(var(--chart-3))' },
  { name: 'W trakcie', color: 'hsl(var(--chart-1))' },
  { name: 'Brak. weryfikacji faktury', color: 'hsl(var(--chart-4))' },
  { name: 'Brakująca faktura', color: 'hsl(var(--chart-5))' },
  { name: 'Zakończone', color: 'hsl(var(--chart-2))' },
];

export function SettlementsStatusChart({
  pending,
  inProgress,
  missingInvoiceVerification = 0,
  missingInvoice = 0,
  completed,
}: SettlementsStatusChartProps) {
  const allData = [
    { name: 'Oczekujące', value: pending, color: 'hsl(var(--chart-3))' },
    { name: 'W trakcie', value: inProgress, color: 'hsl(var(--chart-1))' },
    {
      name: 'Brak. weryfikacji faktury',
      value: missingInvoiceVerification,
      color: 'hsl(var(--chart-4))',
    },
    { name: 'Brakująca faktura', value: missingInvoice, color: 'hsl(var(--chart-5))' },
    { name: 'Zakończone', value: completed, color: 'hsl(var(--chart-2))' },
  ];
  const total = pending + inProgress + missingInvoiceVerification + missingInvoice + completed;
  const chartData = allData.filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-sm">
        Brak rozliczeń
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
          Łącznie: {total} rozliczeń
        </p>
        {ALL_STATUSES.map(({ name, color }) => {
          const item = allData.find((d) => d.name === name)!;
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={name} className="flex items-center gap-3">
              <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm flex-1">{name}</span>
              <span className="text-sm font-semibold tabular-nums">{item.value}</span>
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
