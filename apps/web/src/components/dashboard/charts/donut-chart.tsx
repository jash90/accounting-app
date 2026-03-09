import { Cell, Pie, PieChart } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export interface DonutChartItem {
  /** Unique identifier for the slice (used as React key) */
  key: string;
  /** Display label shown in legend and tooltip */
  label: string;
  /** Numeric value for this slice */
  value: number;
  /** CSS color string (e.g. 'hsl(var(--chart-1))') */
  color: string;
}

interface DonutChartProps {
  data: DonutChartItem[];
  total: number;
  /** Message shown when total is 0 */
  emptyLabel: string;
  /** Summary text shown above the legend (e.g. 'Łącznie: 42 zadań') */
  totalLabel: string;
}

/**
 * Reusable donut (hollow pie) chart with a legend.
 * Used across module dashboards for status/type breakdowns.
 */
export function DonutChart({ data, total, emptyLabel, totalLabel }: DonutChartProps) {
  const chartConfig = Object.fromEntries(
    data.map((item) => [item.label, { label: item.label, color: item.color }])
  ) as ChartConfig;

  const chartData = data.filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <ChartContainer config={chartConfig} className="h-[180px] w-[180px] shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="label" />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            innerRadius={52}
            outerRadius={80}
            strokeWidth={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {totalLabel}
        </p>
        {data.map(({ key, label, color, value }) => {
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
