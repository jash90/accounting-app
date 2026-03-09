import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface OfferPipelineChartProps {
  draftCount: number;
  readyCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expiredCount: number;
}

const chartConfig = {
  value: { label: 'Oferty' },
} satisfies ChartConfig;

const COLORS = [
  '#94a3b8',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-2))',
  'hsl(var(--destructive))',
  'hsl(var(--chart-4))',
];

export function OfferPipelineChart({
  draftCount,
  readyCount,
  sentCount,
  acceptedCount,
  rejectedCount,
  expiredCount,
}: OfferPipelineChartProps) {
  const data = [
    { status: 'Szkic', value: draftCount },
    { status: 'Gotowe', value: readyCount },
    { status: 'Wysłane', value: sentCount },
    { status: 'Zaakcept.', value: acceptedCount },
    { status: 'Odrzucone', value: rejectedCount },
    { status: 'Wygasłe', value: expiredCount },
  ];

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="status" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
