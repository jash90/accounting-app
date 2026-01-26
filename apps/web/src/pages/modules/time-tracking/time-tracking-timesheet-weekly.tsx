import { useNavigate } from 'react-router-dom';

import { format } from 'date-fns';
import { ArrowLeft, Calendar, CalendarDays, List } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { TimerWidget, WeeklyTimesheet } from '@/components/time-tracking';
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
    <div className="container mx-auto space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(basePath)}
          className="min-h-[44px] sm:min-h-0"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Powrót</span>
        </Button>
      </div>

      <PageHeader
        title="Timesheet tygodniowy"
        description="Widok tygodniowy z analizą czasu pracy"
        icon={<CalendarDays className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/entries`)}
              className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/timesheet/daily`)}
              className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0"
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="bg-accent min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0"
            >
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
