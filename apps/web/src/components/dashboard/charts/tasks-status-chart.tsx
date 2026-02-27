import { DonutChart } from './donut-chart';

interface TasksStatusChartProps {
  byStatus: Record<string, number>;
  total: number;
}

const STATUS_CONFIG = [
  { key: 'backlog', label: 'Backlog', color: 'hsl(var(--chart-5))' },
  { key: 'todo', label: 'Do zrobienia', color: 'hsl(var(--chart-4))' },
  { key: 'in_progress', label: 'W trakcie', color: 'hsl(var(--chart-1))' },
  { key: 'in_review', label: 'Recenzja', color: 'hsl(var(--chart-3))' },
  { key: 'done', label: 'Ukończone', color: 'hsl(var(--chart-2))' },
  { key: 'cancelled', label: 'Anulowane', color: 'hsl(var(--muted-foreground))' },
];

export function TasksStatusChart({ byStatus, total }: TasksStatusChartProps) {
  const data = STATUS_CONFIG.map(({ key, label, color }) => ({
    key,
    label,
    value: byStatus[key] ?? 0,
    color,
  }));

  return (
    <DonutChart
      data={data}
      total={total}
      emptyLabel="Brak zadań"
      totalLabel={`Łącznie: ${total} zadań`}
    />
  );
}
