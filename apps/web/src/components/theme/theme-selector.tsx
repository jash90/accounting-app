import { useTheme } from '@/lib/hooks/use-theme';

import { ThemeCard } from './theme-card';

export function ThemeSelector() {
  const { themeId, setTheme, availableThemes, resolvedColorMode } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {availableThemes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          isSelected={theme.id === themeId}
          colorMode={resolvedColorMode}
          onSelect={() => setTheme(theme.id)}
        />
      ))}
    </div>
  );
}
