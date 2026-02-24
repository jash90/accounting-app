import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface TimeTrackedChartProps {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalAmount: number;
}

const chartConfig = {
  billable: { label: 'Rozliczalne', color: 'hsl(var(--chart-2))' },
  nonBillable: { label: 'Nierozliczalne', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

function minutesToHours(minutes: number) {
  return Math.round(minutes / 60);
}

export function TimeTrackedChart({
  totalMinutes,
  billableMinutes,
  nonBillableMinutes,
  totalAmount,
}: TimeTrackedChartProps) {
  const data = [
    {
      label: 'Bieżący miesiąc',
      billable: minutesToHours(billableMinutes),
      nonBillable: minutesToHours(nonBillableMinutes),
    },
  ];

  const totalHours = minutesToHours(totalMinutes);
  const billablePercent = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-baseline gap-4">
        <span className="text-foreground text-2xl font-bold">{totalHours}h</span>
        <span className="text-muted-foreground text-sm">{billablePercent}% rozliczalne</span>
        {totalAmount > 0 && (
          <span className="text-muted-foreground ml-auto text-sm">
            {totalAmount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
          </span>
        )}
      </div>
      <ChartContainer config={chartConfig} className="h-[160px] w-full">
        <BarChart data={data} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="billable" stackId="a" fill="var(--color-billable)" radius={[0, 0, 0, 0]} />
          <Bar
            dataKey="nonBillable"
            stackId="a"
            fill="var(--color-nonBillable)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
          <span className="text-muted-foreground">Rozliczalne</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
          <span className="text-muted-foreground">Nierozliczalne</span>
        </div>
      </div>
    </div>
  );
}
