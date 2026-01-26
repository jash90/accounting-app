import { cn } from '@/lib/utils/cn';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  valueColor?: string;
  borderColor?: string;
  isLoading?: boolean;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBg = 'bg-primary',
  valueColor = 'text-foreground',
  borderColor,
  isLoading = false,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className={cn('flex flex-1 flex-col', borderColor)}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-3">
          <div className={cn('rounded-lg p-2 text-white', iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className={cn('text-3xl font-bold', valueColor, valueClassName)}>{value}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
