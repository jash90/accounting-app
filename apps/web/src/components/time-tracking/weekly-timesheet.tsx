import { useState, useMemo } from 'react';
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyTimesheet } from '@/lib/hooks/use-time-tracking';
import { TimesheetDayDto } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/time';

/**
 * Polish pluralization for "wpis" (entry).
 * Polish has complex plural rules:
 * - 1: wpis (singular)
 * - 2-4, 22-24, 32-34, etc.: wpisy
 * - 0, 5-21, 25-31, etc.: wpisów
 */
function pluralizeEntries(count: number): string {
  if (count === 1) return 'wpis';
  const lastTwo = count % 100;
  const lastOne = count % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return 'wpisów';
  if (lastOne >= 2 && lastOne <= 4) return 'wpisy';
  return 'wpisów';
}

interface WeeklyTimesheetProps {
  className?: string;
  onDayClick?: (date: Date) => void;
}

export function WeeklyTimesheet({ className, onDayClick }: WeeklyTimesheetProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );
  const dateString = format(weekStart, 'yyyy-MM-dd');

  const { data: timesheet, isPending, error } = useWeeklyTimesheet(dateString);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [weekStart, weekEnd]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) =>
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const goToThisWeek = () => {
    setSelectedDate(new Date());
  };

  const isCurrentWeek = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    return isSameDay(weekStart, currentWeekStart);
  }, [weekStart]);

  const getDayData = (day: Date): TimesheetDayDto | undefined => {
    if (!timesheet?.days) return undefined;
    return timesheet.days.find((d) => {
      const dayDate = typeof d.date === 'string' ? parseISO(d.date) : d.date;
      return isSameDay(dayDate, day);
    });
  };

  if (isPending) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet tygodniowy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet tygodniowy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Nie udało się załadować danych timesheet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Timesheet tygodniowy
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isCurrentWeek ? 'default' : 'outline'}
            size="sm"
            onClick={goToThisWeek}
            className="min-w-[200px]"
          >
            {format(weekStart, 'd MMM', { locale: pl })} -{' '}
            {format(weekEnd, 'd MMM yyyy', { locale: pl })}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Weekly Summary */}
        {timesheet && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Czas całkowity</span>
              </div>
              <p className="text-2xl font-mono font-semibold">
                {formatDuration(timesheet.summary?.totalMinutes ?? 0)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Rozliczalny</span>
              </div>
              <p className="text-2xl font-mono font-semibold">
                {formatDuration(timesheet.summary?.billableMinutes ?? 0)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Kwota</span>
              </div>
              <p className="text-2xl font-semibold">
                {(timesheet.summary?.totalAmount ?? 0).toLocaleString('pl-PL')} PLN
              </p>
            </div>
          </div>
        )}

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayData = getDayData(day);
            const isToday = isSameDay(day, new Date());
            const hasEntries = dayData && dayData.entries && dayData.entries.length > 0;

            return (
              <Card
                key={day.toISOString()}
                tabIndex={onDayClick ? 0 : undefined}
                role={onDayClick ? 'button' : undefined}
                aria-label={onDayClick ? `Wybierz ${format(day, 'd MMMM yyyy', { locale: pl })}` : undefined}
                onClick={() => onDayClick?.(day)}
                onKeyDown={(e) => {
                  if (onDayClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onDayClick(day);
                  }
                }}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isToday && 'ring-2 ring-primary',
                  onDayClick && 'hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
              >
                <CardContent className="p-3">
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(day, 'EEE', { locale: pl })}
                    </p>
                    <p
                      className={cn(
                        'text-lg font-semibold',
                        isToday && 'text-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </p>
                  </div>

                  {hasEntries ? (
                    <div className="space-y-2">
                      <div className="text-center">
                        <p className="text-lg font-mono font-semibold">
                          {formatDuration(dayData.totalMinutes ?? 0)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Badge variant="secondary" className="text-xs">
                          {dayData.entries.length} {pluralizeEntries(dayData.entries.length)}
                        </Badge>
                        {dayData.billableMinutes > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {formatDuration(dayData.billableMinutes ?? 0)} rozl.
                          </Badge>
                        )}
                      </div>
                      {dayData.totalAmount > 0 && (
                        <p className="text-xs text-center text-muted-foreground">
                          {dayData.totalAmount.toLocaleString('pl-PL')} PLN
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground">-</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
}
