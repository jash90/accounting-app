import { useNavigate, useSearchParams } from 'react-router-dom';

import { parseISO } from 'date-fns';
import { ArrowLeft, Calendar, CalendarDays, List } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { DailyTimesheet } from '@/components/time-tracking/daily-timesheet';
import { TimerWidget } from '@/components/time-tracking/timer-widget';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';


export default function TimeTrackingTimesheetDailyPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? parseISO(dateParam) : undefined;

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/time-tracking';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/time-tracking';
      default:
        return '/modules/time-tracking';
    }
  };

  const basePath = getBasePath();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Timesheet dzienny"
        description="Widok dzienny z podsumowaniem czasu pracy"
        icon={<Calendar className="h-6 w-6" />}
        titleAction={
          <div
            className="flex items-center gap-1 rounded-lg border p-1"
            role="group"
            aria-label="Widok timesheet"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/entries`)}
              aria-label="Lista wpisów"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="bg-accent"
              aria-label="Widok dzienny"
              aria-current="page"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/timesheet/weekly`)}
              aria-label="Widok tygodniowy"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {/* Timer Widget */}
      <TimerWidget compact />

      {/* Daily Timesheet */}
      <DailyTimesheet initialDate={initialDate} />
    </div>
  );
}
