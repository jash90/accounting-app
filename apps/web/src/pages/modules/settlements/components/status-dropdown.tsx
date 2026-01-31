import { useState } from 'react';

import { Check, CheckCircle, ChevronDown, Clock, PlayCircle } from 'lucide-react';

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
  [SettlementStatus.COMPLETED]: {
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-50',
  },
};

export function StatusDropdown({
  currentStatus,
  onStatusChange,
  disabled = false,
  isLoading = false,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const currentConfig = STATUS_CONFIG[currentStatus];
  const CurrentIcon = currentConfig.icon;

  const handleStatusSelect = (status: SettlementStatus) => {
    if (status !== currentStatus) {
      onStatusChange(status);
    }
    setOpen(false);
  };

  return (
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
        {Object.values(SettlementStatus).map((status) => {
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
  );
}
