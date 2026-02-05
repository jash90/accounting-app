import { memo, useCallback } from 'react';

import { MessageSquare, MoreHorizontal, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type SettlementStatus } from '@/lib/api/endpoints/settlements';

import { StatusBadge } from '../components/status-badge';
import { StatusDropdown } from '../components/status-dropdown';
import { useSettlementColumnsContext } from '../contexts/settlement-columns-context';

/**
 * Memoized status cell component that reads isPending from context.
 * Only this cell will re-render when isPending changes, not all columns.
 */
interface StatusCellProps {
  settlementId: string;
  currentStatus: SettlementStatus;
}

export const StatusCell = memo(function StatusCell({
  settlementId,
  currentStatus,
}: StatusCellProps) {
  const { hasWritePermission, onStatusChange, isStatusUpdatePending } =
    useSettlementColumnsContext();

  // Memoize the callback to prevent StatusDropdown re-renders
  const handleStatusChange = useCallback(
    (status: SettlementStatus) => {
      onStatusChange(settlementId, status);
    },
    [onStatusChange, settlementId]
  );

  if (hasWritePermission) {
    return (
      <StatusDropdown
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
        isLoading={isStatusUpdatePending}
      />
    );
  }

  return <StatusBadge status={currentStatus} />;
});

/**
 * Memoized actions cell component.
 * Uses context to avoid inline callbacks in column definition.
 */
interface ActionsCellProps {
  settlementId: string;
}

export const ActionsCell = memo(function ActionsCell({ settlementId }: ActionsCellProps) {
  const { hasManagePermission, onNavigateToComments, onNavigateToAssign } =
    useSettlementColumnsContext();

  // Memoize callbacks to prevent re-creating on each render
  const handleNavigateToComments = useCallback(() => {
    onNavigateToComments(settlementId);
  }, [onNavigateToComments, settlementId]);

  const handleNavigateToAssign = useCallback(() => {
    onNavigateToAssign(settlementId);
  }, [onNavigateToAssign, settlementId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Otwórz menu akcji">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleNavigateToComments}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Komentarze
        </DropdownMenuItem>

        {hasManagePermission ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNavigateToAssign}>
              <UserPlus className="mr-2 h-4 w-4" />
              Przypisz pracownika
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
