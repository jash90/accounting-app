import { X, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ModelFavoritesChipProps {
  modelId: string;
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
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
        'border hover:bg-accent/50',
        isSelected
          ? 'bg-apptax-soft-teal border-apptax-teal text-apptax-navy'
          : 'bg-background border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {type === 'favorite' ? (
        <Star className="w-3 h-3 fill-current" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      <span className="max-w-[150px] truncate">{modelName}</span>
      {onRemove && type === 'favorite' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
          title="Remove from favorites"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </button>
  );
}
