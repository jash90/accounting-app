import { type ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { type EmployeeStatsDto } from '@/lib/api/endpoints/settlements';

export const employeeStatsColumns: ColumnDef<EmployeeStatsDto>[] = [
  {
    accessorKey: 'email',
    header: 'Pracownik',
    cell: ({ row }) => {
      const stat = row.original;
      return (
        <div className="flex flex-col">
          <span className="text-foreground font-medium">
            {stat.firstName && stat.lastName ? `${stat.firstName} ${stat.lastName}` : stat.email}
          </span>
          {stat.firstName && stat.lastName && (
            <span className="text-muted-foreground text-xs">{stat.email}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'total',
    header: 'Razem',
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original.total}
      </Badge>
    ),
  },
  {
    accessorKey: 'pending',
    header: 'Oczekujące',
    cell: ({ row }) => (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        {row.original.pending}
      </Badge>
    ),
  },
  {
    accessorKey: 'inProgress',
    header: 'W trakcie',
    cell: ({ row }) => (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        {row.original.inProgress}
      </Badge>
    ),
  },
  {
    accessorKey: 'completed',
    header: 'Zakończone',
    cell: ({ row }) => (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        {row.original.completed}
      </Badge>
    ),
  },
  {
    accessorKey: 'completionRate',
    header: 'Realizacja',
    cell: ({ row }) => {
      const rate = Math.round(row.original.completionRate * 100);
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-sm font-medium">{rate}%</span>
        </div>
      );
    },
  },
];
