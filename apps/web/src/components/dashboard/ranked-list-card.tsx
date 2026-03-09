import type React from 'react';

import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface RankedListItem {
  key: string;
  label: string;
  value: string | number;
}

interface RankedListCardProps {
  title: string;
  isPending: boolean;
  items: RankedListItem[] | undefined;
  emptyMessage?: string;
  limit?: number;
  valueClassName?: string;
  className?: string;
  footer?: React.ReactNode;
}

export function RankedListCard({
  title,
  isPending,
  items,
  emptyMessage = 'Brak danych',
  limit = 5,
  valueClassName = 'font-medium',
  className,
  footer,
}: RankedListCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : !items?.length ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, limit).map((item) => (
              <div key={item.key} className="flex items-center justify-between text-sm">
                <span className="max-w-[65%] truncate">{item.label}</span>
                <span className={valueClassName}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
