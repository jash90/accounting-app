import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Clock, Plus, List, Calendar, CalendarDays } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { TimeEntriesList, TimeEntryFormDialog, TimerWidget } from '@/components/time-tracking';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/auth-context';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { UserRole } from '@/types/enums';

export default function TimeTrackingEntriesPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { hasWritePermission } = useModulePermissions('time-tracking');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Wpisy czasu"
        description="Przeglądaj i zarządzaj wpisami czasu"
        icon={<Clock className="h-6 w-6" />}
        titleAction={
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="sm" className="bg-accent">
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/timesheet/daily`)}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${basePath}/timesheet/weekly`)}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        }
        action={
          hasWritePermission ? (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nowy wpis
            </Button>
          ) : undefined
        }
      />

      {/* Timer Widget */}
      <TimerWidget compact />

      {/* Entries List */}
      <TimeEntriesList showHeader={false} />

      {/* Create Dialog */}
      <TimeEntryFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
