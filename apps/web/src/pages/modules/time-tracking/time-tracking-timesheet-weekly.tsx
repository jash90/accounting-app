import { useNavigate } from 'react-router-dom';

import { format } from 'date-fns';
import { ArrowLeft, Calendar, CalendarDays, List } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { TimerWidget } from '@/components/time-tracking/timer-widget';
import { WeeklyTimesheet } from '@/components/time-tracking/weekly-timesheet';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';


export default function TimeTrackingTimesheetWeeklyPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

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

  const handleDayClick = (date: Date) => {
    navigate(`${basePath}/timesheet/daily?date=${format(date, 'yyyy-MM-dd')}`);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Timesheet tygodniowy"
        description="Widok tygodniowy z analizą czasu pracy"
        icon={<CalendarDays className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/entries`)}>
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/timesheet/daily`)}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="bg-accent">
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Timer Widget */}
      <TimerWidget compact />

      {/* Weekly Timesheet */}
      <WeeklyTimesheet onDayClick={handleDayClick} />
    </div>
  );
}
