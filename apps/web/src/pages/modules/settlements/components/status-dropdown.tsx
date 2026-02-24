import { memo, useCallback, useState } from 'react';

import {
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  FileQuestion,
  FileX,
  PlayCircle,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettlementStatus, SettlementStatusLabels } from '@/lib/api/endpoints/settlements';
import { cn } from '@/lib/utils/cn';

interface StatusDropdownProps {
  currentStatus: SettlementStatus;
  onStatusChange: (status: SettlementStatus, notes?: string) => void;
  onSendEmail?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  [SettlementStatus.PENDING]: {
    icon: Clock,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    hoverColor: 'hover:bg-yellow-50',
  },
  [SettlementStatus.IN_PROGRESS]: {
    icon: PlayCircle,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-50',
  },
  [SettlementStatus.MISSING_INVOICE_VERIFICATION]: {
    icon: FileQuestion,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    hoverColor: 'hover:bg-orange-50',
  },
  [SettlementStatus.MISSING_INVOICE]: {
    icon: FileX,
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-50',
  },
  [SettlementStatus.COMPLETED]: {
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-50',
  },
};

const MISSING_STATUSES = new Set([
  SettlementStatus.MISSING_INVOICE_VERIFICATION,
  SettlementStatus.MISSING_INVOICE,
]);

// Pre-computed array to avoid Object.values() call on every render
const SETTLEMENT_STATUS_VALUES = Object.values(SettlementStatus);

export const StatusDropdown = memo(function StatusDropdown({
  currentStatus,
  onStatusChange,
  onSendEmail,
  disabled = false,
  isLoading = false,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SettlementStatus | null>(null);
  const currentConfig = STATUS_CONFIG[currentStatus];
  const CurrentIcon = currentConfig.icon;

  const handleStatusSelect = useCallback(
    (status: SettlementStatus) => {
      if (status !== currentStatus) {
        if (onSendEmail && MISSING_STATUSES.has(status)) {
          // Store pending status and show email confirmation dialog
          setPendingStatus(status);
        } else {
          onStatusChange(status);
        }
      }
      setOpen(false);
    },
    [currentStatus, onStatusChange, onSendEmail]
  );

  const handleConfirmWithEmail = useCallback(() => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
      onSendEmail?.();
      setPendingStatus(null);
    }
  }, [pendingStatus, onStatusChange, onSendEmail]);

  const handleConfirmWithoutEmail = useCallback(() => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
      setPendingStatus(null);
    }
  }, [pendingStatus, onStatusChange]);

  const handleDialogCancel = useCallback(() => {
    setPendingStatus(null);
  }, []);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isLoading}
            className={cn(
              'min-w-[140px] justify-between',
              currentConfig.bgColor,
              currentConfig.textColor,
              currentConfig.borderColor,
              currentConfig.hoverColor
            )}
          >
            <span className="flex items-center gap-2">
              <CurrentIcon className="h-4 w-4" />
              {SettlementStatusLabels[currentStatus]}
            </span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
          {SETTLEMENT_STATUS_VALUES.map((status) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;

            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusSelect(status)}
                className={cn('flex items-center gap-2', config.hoverColor)}
              >
                <Icon className={cn('h-4 w-4', config.textColor)} />
                <span>{SettlementStatusLabels[status]}</span>
                {status === currentStatus && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) handleDialogCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brakująca faktura — powiadom klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Status rozliczenia został zmieniony na &quot;
              {pendingStatus ? SettlementStatusLabels[pendingStatus] : ''}&quot;. Czy chcesz wysłać
              email do klienta z prośbą o dosłanie brakującej faktury?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogCancel}>Anuluj zmianę</AlertDialogCancel>
            <Button variant="outline" onClick={handleConfirmWithoutEmail}>
              Tylko zmień status
            </Button>
            <AlertDialogAction onClick={handleConfirmWithEmail}>
              Wyślij email i zmień status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
