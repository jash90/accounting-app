import { cn } from '@/lib/utils/cn';
import { ClientIcon } from '@/types/entities';
import { IconType } from '@/types/enums';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as LucideIcons from 'lucide-react';

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

export function IconBadge({
  icon,
  size = 'md',
  showTooltip = true,
  className,
}: IconBadgeProps) {
  const renderIcon = () => {
    switch (icon.iconType) {
      case IconType.LUCIDE: {
        // Get Lucide icon dynamically
        const iconName = icon.iconValue || 'Circle';
        // Convert kebab-case to PascalCase for Lucide icons
        const pascalCaseName = iconName
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');

        const LucideIcon = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[pascalCaseName];

        if (LucideIcon) {
          // Use inline style for color - Tailwind can't detect dynamic classes like text-[${color}]
          return (
            <LucideIcon
              size={iconSizeMap[size]}
              className="shrink-0"
              style={icon.color ? { color: icon.color } : undefined}
            />
          );
        }
        // Fallback to a circle if icon not found
        return (
          <LucideIcons.Circle
            size={iconSizeMap[size]}
            className="shrink-0"
            style={icon.color ? { color: icon.color } : undefined}
          />
        );
      }

      case IconType.EMOJI: {
        return (
          <span
            className={cn(
              'flex items-center justify-center shrink-0',
              emojiSizeClasses[size]
            )}
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
                'rounded-full bg-muted flex items-center justify-center',
                sizeClasses[size]
              )}
              style={icon.color ? { backgroundColor: icon.color } : undefined}
            >
              <LucideIcons.Image
                size={iconSizeMap[size] * 0.6}
                className="text-muted-foreground"
              />
            </div>
          );
        }

        return (
          <img
            src={`/api/modules/clients/icons/${icon.id}/file`}
            alt={icon.name}
            className={cn('object-contain rounded', sizeClasses[size])}
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{icon.tooltip || icon.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium',
                  size === 'sm' && 'w-5 h-5',
                  size === 'md' && 'w-6 h-6',
                  size === 'lg' && 'w-8 h-8'
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
        </TooltipProvider>
      )}
    </div>
  );
}
