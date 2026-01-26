import { type Theme } from '@/lib/themes';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  colorMode: 'light' | 'dark';
  onSelect: () => void;
}

export function ThemeCard({ theme, isSelected, colorMode, onSelect }: ThemeCardProps) {
  const preview = theme.preview[colorMode];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-lg border-2 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-2'
          : 'border-border hover:border-primary/50'
      )}
      aria-pressed={isSelected}
      aria-label={`Wybierz motyw ${theme.name}`}
    >
      {/* Preview section */}
      <div
        className="flex h-20 items-center justify-center gap-2 p-3"
        style={{ backgroundColor: preview.background }}
      >
        {/* Primary color circle */}
        <div
          className="h-8 w-8 rounded-full shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: preview.primary }}
          title="Kolor główny"
        />
        {/* Secondary color circle */}
        <div
          className="h-8 w-8 rounded-full shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: preview.secondary }}
          title="Kolor dodatkowy"
        />
        {/* Accent color circle */}
        <div
          className="h-8 w-8 rounded-full shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: preview.accent }}
          title="Kolor akcentowy"
        />
      </div>

      {/* Info section */}
      <div className="bg-card flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between">
          <span className="text-foreground text-sm font-medium">{theme.name}</span>
          {isSelected && (
            <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">{theme.description}</span>
      </div>
    </button>
  );
}
