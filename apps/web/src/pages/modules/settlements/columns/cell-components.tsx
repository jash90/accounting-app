import { memo, useCallback } from 'react';

import { MessageSquare, MoreHorizontal, Pencil, UserPlus } from 'lucide-react';

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
  const { hasWritePermission, onStatusChange, onSendEmail, isStatusUpdatePending } =
    useSettlementColumnsContext();

  // Memoize the callback to prevent StatusDropdown re-renders
  const handleStatusChange = useCallback(
    (status: SettlementStatus) => {
      onStatusChange(settlementId, status);
    },
    [onStatusChange, settlementId]
  );

  const handleSendEmail = useCallback(() => {
    onSendEmail(settlementId);
  }, [onSendEmail, settlementId]);

  if (hasWritePermission) {
    return (
      <StatusDropdown
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
        onSendEmail={handleSendEmail}
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
  const {
    hasWritePermission,
    hasManagePermission,
    onNavigateToComments,
    onNavigateToAssign,
    onEdit,
  } = useSettlementColumnsContext();

  // Memoize callbacks to prevent re-creating on each render
  const handleNavigateToComments = useCallback(() => {
    onNavigateToComments(settlementId);
  }, [onNavigateToComments, settlementId]);

  const handleNavigateToAssign = useCallback(() => {
    onNavigateToAssign(settlementId);
  }, [onNavigateToAssign, settlementId]);

  const handleEdit = useCallback(() => {
    onEdit(settlementId);
  }, [onEdit, settlementId]);

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

        {hasWritePermission ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>
          </>
        ) : null}

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
