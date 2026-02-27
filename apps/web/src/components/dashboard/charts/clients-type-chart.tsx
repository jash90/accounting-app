import { DonutChart } from './donut-chart';

interface ClientsTypeChartProps {
  byEmploymentType: Record<string, number>;
  total: number;
}

const TYPE_CONFIG = [
  { key: 'DG', label: 'Dział. gosp.', color: 'hsl(var(--chart-1))' },
  { key: 'DG_ETAT', label: 'DG + Etat', color: 'hsl(var(--chart-2))' },
  { key: 'DG_AKCJONARIUSZ', label: 'DG + Akcj.', color: 'hsl(var(--chart-3))' },
  { key: 'DG_HALF_TIME_BELOW_MIN', label: '1/2 et. < min.', color: 'hsl(var(--chart-4))' },
  { key: 'DG_HALF_TIME_ABOVE_MIN', label: '1/2 et. > min.', color: 'hsl(var(--chart-5))' },
];

export function ClientsTypeChart({ byEmploymentType, total }: ClientsTypeChartProps) {
  const data = TYPE_CONFIG.map(({ key, label, color }) => ({
    key,
    label,
    value: byEmploymentType[key] ?? 0,
    color,
  }));

  return (
    <DonutChart
      data={data}
      total={total}
      emptyLabel="Brak klientów"
      totalLabel={`Łącznie: ${total} klientów`}
    />
  );
}
