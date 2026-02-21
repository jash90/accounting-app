import { Clock, Star, X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

interface ModelFavoritesChipProps {
  modelName: string;
  isSelected?: boolean;
  onClick: () => void;
  onRemove?: () => void;
  type: 'favorite' | 'recent';
}

export function ModelFavoritesChip({
  modelName,
  isSelected = false,
  onClick,
  onRemove,
  type,
}: ModelFavoritesChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        'hover:bg-accent/50 border',
        isSelected
          ? 'bg-accent/10 border-accent text-foreground'
          : 'bg-background border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {type === 'favorite' ? (
        <Star className="h-3 w-3 fill-current" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span className="max-w-[150px] truncate">{modelName}</span>
      {onRemove && type === 'favorite' && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          className="hover:bg-muted-foreground/20 ml-0.5 cursor-pointer rounded-full p-0.5 transition-colors"
          title="Usuń z ulubionych"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
