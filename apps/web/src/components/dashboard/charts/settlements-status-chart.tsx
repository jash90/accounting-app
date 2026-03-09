import { DonutChart } from './donut-chart';

interface SettlementsStatusChartProps {
  pending: number;
  inProgress: number;
  missingInvoiceVerification?: number;
  missingInvoice?: number;
  completed: number;
}

const SETTLEMENT_CONFIG = [
  { key: 'pending', label: 'Oczekujące', color: 'hsl(var(--chart-3))' },
  { key: 'inProgress', label: 'W trakcie', color: 'hsl(var(--chart-1))' },
  {
    key: 'missingInvoiceVerification',
    label: 'Brak. weryfikacji faktury',
    color: 'hsl(var(--chart-4))',
  },
  { key: 'missingInvoice', label: 'Brakująca faktura', color: 'hsl(var(--chart-5))' },
  { key: 'completed', label: 'Zakończone', color: 'hsl(var(--chart-2))' },
];

export function SettlementsStatusChart({
  pending,
  inProgress,
  missingInvoiceVerification = 0,
  missingInvoice = 0,
  completed,
}: SettlementsStatusChartProps) {
  const values: Record<string, number> = {
    pending,
    inProgress,
    missingInvoiceVerification,
    missingInvoice,
    completed,
  };
  const total = pending + inProgress + missingInvoiceVerification + missingInvoice + completed;
  const data = SETTLEMENT_CONFIG.map(({ key, label, color }) => ({
    key,
    label,
    value: values[key],
    color,
  }));

  return (
    <DonutChart
      data={data}
      total={total}
      emptyLabel="Brak rozliczeń"
      totalLabel={`Łącznie: ${total} rozliczeń`}
    />
  );
}
