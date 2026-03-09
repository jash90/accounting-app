import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/lib/hooks/use-theme';
import { type ColorMode } from '@/lib/themes';
import { cn } from '@/lib/utils/cn';


interface ColorModeOption {
  value: ColorMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const colorModeOptions: ColorModeOption[] = [
  {
    value: 'light',
    label: 'Jasny',
    description: 'Jasny motyw dla lepszej widoczności w dzień',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Ciemny',
    description: 'Ciemny motyw przyjazny dla oczu',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Systemowy',
    description: 'Automatycznie dopasuj do ustawień systemu',
    icon: Monitor,
  },
];

export function ThemeModeToggle() {
  const { colorMode, setColorMode } = useTheme();

  return (
    <div className="flex flex-col gap-3">
      {colorModeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = colorMode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setColorMode(option.value)}
            className={cn(
              'flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
            aria-pressed={isSelected}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground text-sm font-medium">{option.label}</span>
              <span className="text-muted-foreground text-xs">{option.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
