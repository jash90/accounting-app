import { cn } from '@/lib/utils/cn';
import { getIconByKebabName, type LucideIconComponent } from '@/lib/utils/lucide-icon-registry';
import { type ClientIcon } from '@/types/entities';
import { IconType } from '@/types/enums';
import { Image } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface IconBadgeProps {
  icon: ClientIcon;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const iconSizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
};

const emojiSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

export function IconBadge({ icon, size = 'md', showTooltip = true, className }: IconBadgeProps) {
  // Render icon based on type - getIconByKebabName returns cached components from registry
  const renderIcon = () => {
    switch (icon.iconType) {
      case IconType.LUCIDE: {
        // Get Lucide icon dynamically from registry
        const iconName = icon.iconValue || 'Circle';
        // Use the registry to get the icon component (handles kebab-case conversion)
        const LucideIcon: LucideIconComponent = getIconByKebabName(iconName);

        // Use inline style for color - Tailwind can't detect dynamic classes like text-[${color}]
        return (
          <LucideIcon
            size={iconSizeMap[size]}
            className="shrink-0"
            style={icon.color ? { color: icon.color } : undefined}
          />
        );
      }

      case IconType.EMOJI: {
        return (
          <span
            className={cn('flex shrink-0 items-center justify-center', emojiSizeClasses[size])}
            role="img"
            aria-label={icon.name}
          >
            {icon.iconValue || '⭐'}
          </span>
        );
      }

      case IconType.CUSTOM: {
        if (!icon.filePath) {
          // Fallback if no file path
          return (
            <div
              className={cn(
                'bg-muted flex items-center justify-center rounded-full',
                sizeClasses[size]
              )}
              style={icon.color ? { backgroundColor: icon.color } : undefined}
            >
              <Image size={iconSizeMap[size] * 0.6} className="text-muted-foreground" />
            </div>
          );
        }

        return (
          <img
            src={`/api/modules/clients/icons/${icon.id}/file`}
            alt={icon.name}
            className={cn('rounded object-contain', sizeClasses[size])}
          />
        );
      }

      default:
        return null;
    }
  };

  const badge = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded',
        sizeClasses[size],
        className
      )}
    >
      {renderIcon()}
    </div>
  );

  if (showTooltip && (icon.tooltip || icon.name)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>{icon.tooltip || icon.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

interface IconBadgeListProps {
  icons: ClientIcon[];
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  className?: string;
}

export function IconBadgeList({
  icons,
  size = 'md',
  maxVisible = 5,
  className,
}: IconBadgeListProps) {
  const visibleIcons = icons.slice(0, maxVisible);
  const hiddenCount = icons.length - maxVisible;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visibleIcons.map((icon) => (
        <IconBadge key={icon.id} icon={icon} size={size} />
      ))}
      {hiddenCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full text-xs font-medium',
                size === 'sm' && 'h-5 w-5',
                size === 'md' && 'h-6 w-6',
                size === 'lg' && 'h-8 w-8'
              )}
            >
              +{hiddenCount}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              {icons.slice(maxVisible).map((icon) => (
                <span key={icon.id}>{icon.name}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
