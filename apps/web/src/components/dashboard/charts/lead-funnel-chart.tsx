import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface LeadFunnelChartProps {
  newCount: number;
  contactedCount: number;
  qualifiedCount: number;
  proposalSentCount: number;
  negotiationCount: number;
  convertedCount: number;
  lostCount: number;
}

const chartConfig = {
  value: { label: 'Leady' },
} satisfies ChartConfig;

export function LeadFunnelChart({
  newCount,
  contactedCount,
  qualifiedCount,
  proposalSentCount,
  negotiationCount,
  convertedCount,
  lostCount,
}: LeadFunnelChartProps) {
  const data = [
    { stage: 'Nowe', value: newCount },
    { stage: 'Skontakt.', value: contactedCount },
    { stage: 'Kwalif.', value: qualifiedCount },
    { stage: 'Oferta', value: proposalSentCount },
    { stage: 'Negocjacje', value: negotiationCount },
    { stage: 'Konwersja', value: convertedCount },
    { stage: 'Utracone', value: lostCount },
  ];

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 48, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="stage"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
