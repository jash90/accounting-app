import { memo } from 'react';

import { format, startOfToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarClock, Edit, Gift, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReliefPeriodResponseDto } from '@/lib/api/endpoints/relief-periods';
import { cn } from '@/lib/utils/cn';

/** Number of days before end date to show warning badge */
export const RELIEF_WARNING_DAYS_THRESHOLD = 30;

export interface ReliefEntryProps {
  relief: ReliefPeriodResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  canWrite: boolean;
  canDelete: boolean;
  isDeleting: boolean;
}

export const ReliefEntry = memo(function ReliefEntry({
  relief,
  onEdit,
  onDelete,
  canWrite,
  canDelete,
  isDeleting,
}: ReliefEntryProps) {
  const startDate = new Date(relief.startDate);
  const endDate = new Date(relief.endDate);
  const today = startOfToday();

  // Use server-calculated isActive for consistency
  const isActive = relief.isActive;
  const isFuture = startDate > today;
  const isExpired = endDate < today;

  const statusLabel = isActive ? 'Aktywna ulga' : isFuture ? 'Zaplanowana ulga' : 'Zakończona ulga';

  // Calculate days until end for active reliefs
  const daysUntilEnd = relief.daysUntilEnd;

  return (
    <div className="border-accent relative border-l-2 pb-4 pl-4">
      <div
        className={`absolute top-0 -left-[7px] h-3 w-3 rounded-full ${
          isActive ? 'bg-green-500' : isFuture ? 'bg-blue-500' : 'bg-gray-400'
        }`}
        role="status"
        aria-label={statusLabel}
      />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant={isActive ? 'default' : isFuture ? 'secondary' : 'outline'}
            className={cn('gap-1', isActive && 'bg-green-500 hover:bg-green-600')}
          >
            {isActive ? (
              <>
                <Gift className="h-3 w-3" />
                {relief.reliefTypeLabel}
              </>
            ) : isFuture ? (
              <>
                <CalendarClock className="h-3 w-3" />
                {relief.reliefTypeLabel}
              </>
            ) : (
              <>
                <Gift className="h-3 w-3" />
                {relief.reliefTypeLabel}
              </>
            )}
          </Badge>
          {isActive && daysUntilEnd !== null && daysUntilEnd <= RELIEF_WARNING_DAYS_THRESHOLD && (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
              {daysUntilEnd === 0 ? 'Kończy się dziś!' : `${daysUntilEnd} dni do końca`}
            </Badge>
          )}
        </div>

        <div className="flex gap-1">
          {canWrite && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                  aria-label="Edytuj ulgę"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edytuj ulgę</TooltipContent>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onDelete}
                  disabled={isDeleting}
                  aria-label="Usuń ulgę"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Usuń ulgę</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Od: </span>
          <span className="font-medium">{format(startDate, 'd MMMM yyyy', { locale: pl })}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Do: </span>
          <span className="font-medium">{format(endDate, 'd MMMM yyyy', { locale: pl })}</span>
          {isExpired && <span className="ml-2 text-gray-500">(zakończona)</span>}
        </p>
        {relief.createdByName && (
          <p className="text-muted-foreground mt-2 text-xs">
            Utworzono przez: {relief.createdByName}
          </p>
        )}
      </div>
    </div>
  );
});
