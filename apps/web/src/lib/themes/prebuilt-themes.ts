import { type Theme } from './theme-config';

/**
 * AppTax - Default theme (current application colors)
 * Primary: Professional Blue (#0A66C2)
 * Secondary: Navy (#1E3A5F)
 * Accent: Teal (#00BFA6)
 */
export const apptaxTheme: Theme = {
  id: 'apptax',
  name: 'AppTax',
  description: 'Profesjonalny niebieski motyw - domyślny',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '230 44% 11%',
      card: '0 0% 100%',
      cardForeground: '230 44% 11%',
      popover: '0 0% 100%',
      popoverForeground: '230 44% 11%',
      primary: '209 90% 40%',
      primaryForeground: '0 0% 100%',
      secondary: '214 52% 25%',
      secondaryForeground: '0 0% 100%',
      muted: '0 0% 96%',
      mutedForeground: '215 14% 46%',
      accent: '170 53% 92%',
      accentForeground: '214 52% 25%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '160 84% 39%',
      successForeground: '0 0% 100%',
      border: '220 13% 91%',
      input: '220 13% 91%',
      ring: '209 90% 40%',
      chart1: '209 90% 40%',
      chart2: '170 100% 37%',
      chart3: '214 52% 25%',
      chart4: '212 64% 57%',
      chart5: '170 53% 92%',
    },
    dark: {
      background: '214 52% 10%',
      foreground: '0 0% 98%',
      card: '214 52% 15%',
      cardForeground: '0 0% 98%',
      popover: '214 52% 15%',
      popoverForeground: '0 0% 98%',
      primary: '212 64% 57%',
      primaryForeground: '214 52% 10%',
      secondary: '214 32% 25%',
      secondaryForeground: '0 0% 98%',
      muted: '214 32% 20%',
      mutedForeground: '215 20% 65%',
      accent: '170 100% 37%',
      accentForeground: '0 0% 98%',
      destructive: '0 63% 31%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 35%',
      successForeground: '0 0% 98%',
      border: '214 32% 25%',
      input: '214 32% 25%',
      ring: '170 100% 37%',
      chart1: '212 64% 57%',
      chart2: '170 100% 50%',
      chart3: '30 80% 55%',
      chart4: '280 65% 60%',
      chart5: '340 75% 55%',
    },
  },
  preview: {
    light: {
      primary: '#0A66C2',
      secondary: '#1E3A5F',
      accent: '#00BFA6',
      background: '#FFFFFF',
    },
    dark: {
      primary: '#4A90D9',
      secondary: '#2D4A6A',
      accent: '#00BFA6',
      background: '#0D1929',
    },
  },
};

/**
 * FlowBooks - Modern Indigo theme
 * Primary: Indigo (#4F46E5)
 * Secondary: Deep Indigo
 * Accent: Emerald (#10B981)
 */
export const flowbooksTheme: Theme = {
  id: 'flowbooks',
  name: 'FlowBooks',
  description: 'Nowoczesny indygo z akcentami szmaragdu',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '224 71% 4%',
      card: '0 0% 100%',
      cardForeground: '224 71% 4%',
      popover: '0 0% 100%',
      popoverForeground: '224 71% 4%',
      primary: '239 84% 67%',
      primaryForeground: '0 0% 100%',
      secondary: '240 5% 96%',
      secondaryForeground: '240 6% 10%',
      muted: '240 5% 96%',
      mutedForeground: '240 4% 46%',
      accent: '160 84% 39%',
      accentForeground: '0 0% 100%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '160 84% 39%',
      successForeground: '0 0% 100%',
      border: '240 6% 90%',
      input: '240 6% 90%',
      ring: '239 84% 67%',
      chart1: '239 84% 67%',
      chart2: '160 84% 39%',
      chart3: '38 92% 50%',
      chart4: '280 65% 60%',
      chart5: '0 84% 60%',
    },
    dark: {
      background: '224 71% 4%',
      foreground: '0 0% 98%',
      card: '224 71% 6%',
      cardForeground: '0 0% 98%',
      popover: '224 71% 6%',
      popoverForeground: '0 0% 98%',
      primary: '239 84% 67%',
      primaryForeground: '0 0% 100%',
      secondary: '240 4% 16%',
      secondaryForeground: '0 0% 98%',
      muted: '240 4% 16%',
      mutedForeground: '240 5% 65%',
      accent: '160 84% 39%',
      accentForeground: '0 0% 100%',
      destructive: '0 63% 31%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 35%',
      successForeground: '0 0% 98%',
      border: '240 4% 16%',
      input: '240 4% 16%',
      ring: '239 84% 67%',
      chart1: '239 84% 67%',
      chart2: '160 84% 50%',
      chart3: '38 92% 60%',
      chart4: '280 65% 70%',
      chart5: '0 84% 70%',
    },
  },
  preview: {
    light: {
      primary: '#6366F1',
      secondary: '#F1F5F9',
      accent: '#10B981',
      background: '#FFFFFF',
    },
    dark: {
      primary: '#6366F1',
      secondary: '#1E293B',
      accent: '#10B981',
      background: '#020617',
    },
  },
};

/**
 * Ocean - Calm blue-cyan theme
 * Primary: Ocean Blue
 * Secondary: Deep Sea
 * Accent: Turquoise
 */
export const oceanTheme: Theme = {
  id: 'ocean',
  name: 'Ocean',
  description: 'Spokojny turkusowo-niebieski',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '200 50% 10%',
      card: '0 0% 100%',
      cardForeground: '200 50% 10%',
      popover: '0 0% 100%',
      popoverForeground: '200 50% 10%',
      primary: '199 89% 48%',
      primaryForeground: '0 0% 100%',
      secondary: '200 50% 20%',
      secondaryForeground: '0 0% 100%',
      muted: '200 20% 96%',
      mutedForeground: '200 20% 46%',
      accent: '175 84% 40%',
      accentForeground: '0 0% 100%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '160 84% 39%',
      successForeground: '0 0% 100%',
      border: '200 20% 90%',
      input: '200 20% 90%',
      ring: '199 89% 48%',
      chart1: '199 89% 48%',
      chart2: '175 84% 40%',
      chart3: '200 50% 20%',
      chart4: '220 70% 55%',
      chart5: '190 60% 70%',
    },
    dark: {
      background: '200 50% 8%',
      foreground: '0 0% 98%',
      card: '200 50% 12%',
      cardForeground: '0 0% 98%',
      popover: '200 50% 12%',
      popoverForeground: '0 0% 98%',
      primary: '199 89% 55%',
      primaryForeground: '200 50% 8%',
      secondary: '200 40% 20%',
      secondaryForeground: '0 0% 98%',
      muted: '200 40% 18%',
      mutedForeground: '200 20% 60%',
      accent: '175 84% 45%',
      accentForeground: '200 50% 8%',
      destructive: '0 63% 31%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 35%',
      successForeground: '0 0% 98%',
      border: '200 40% 20%',
      input: '200 40% 20%',
      ring: '175 84% 45%',
      chart1: '199 89% 55%',
      chart2: '175 84% 50%',
      chart3: '220 70% 60%',
      chart4: '280 65% 60%',
      chart5: '340 75% 55%',
    },
  },
  preview: {
    light: {
      primary: '#0EA5E9',
      secondary: '#164E63',
      accent: '#14B8A6',
      background: '#FFFFFF',
    },
    dark: {
      primary: '#38BDF8',
      secondary: '#1E3A4F',
      accent: '#2DD4BF',
      background: '#0C1A24',
    },
  },
};

/**
 * Forest - Natural green theme
 * Primary: Forest Green
 * Secondary: Dark Moss
 * Accent: Lime
 */
export const forestTheme: Theme = {
  id: 'forest',
  name: 'Forest',
  description: 'Naturalny zielony motyw',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '150 40% 10%',
      card: '0 0% 100%',
      cardForeground: '150 40% 10%',
      popover: '0 0% 100%',
      popoverForeground: '150 40% 10%',
      primary: '142 71% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '150 40% 20%',
      secondaryForeground: '0 0% 100%',
      muted: '140 20% 96%',
      mutedForeground: '150 20% 40%',
      accent: '84 85% 45%',
      accentForeground: '150 40% 10%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '142 71% 45%',
      successForeground: '0 0% 100%',
      border: '140 20% 88%',
      input: '140 20% 88%',
      ring: '142 71% 45%',
      chart1: '142 71% 45%',
      chart2: '84 85% 45%',
      chart3: '150 40% 20%',
      chart4: '120 60% 55%',
      chart5: '160 70% 60%',
    },
    dark: {
      background: '150 40% 6%',
      foreground: '0 0% 98%',
      card: '150 40% 10%',
      cardForeground: '0 0% 98%',
      popover: '150 40% 10%',
      popoverForeground: '0 0% 98%',
      primary: '142 71% 50%',
      primaryForeground: '150 40% 6%',
      secondary: '150 30% 18%',
      secondaryForeground: '0 0% 98%',
      muted: '150 30% 16%',
      mutedForeground: '150 20% 55%',
      accent: '84 85% 50%',
      accentForeground: '150 40% 6%',
      destructive: '0 63% 31%',
      destructiveForeground: '0 0% 98%',
      success: '142 60% 40%',
      successForeground: '0 0% 98%',
      border: '150 30% 18%',
      input: '150 30% 18%',
      ring: '84 85% 50%',
      chart1: '142 71% 55%',
      chart2: '84 85% 55%',
      chart3: '120 60% 60%',
      chart4: '180 65% 55%',
      chart5: '60 70% 60%',
    },
  },
  preview: {
    light: {
      primary: '#22C55E',
      secondary: '#14532D',
      accent: '#84CC16',
      background: '#FFFFFF',
    },
    dark: {
      primary: '#4ADE80',
      secondary: '#1C3A29',
      accent: '#A3E635',
      background: '#0A1F13',
    },
  },
};

/**
 * Sunset - Warm orange theme
 * Primary: Sunset Orange
 * Secondary: Deep Coral
 * Accent: Gold
 */
export const sunsetTheme: Theme = {
  id: 'sunset',
  name: 'Sunset',
  description: 'Ciepły pomarańczowy zachód słońca',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '24 40% 10%',
      card: '0 0% 100%',
      cardForeground: '24 40% 10%',
      popover: '0 0% 100%',
      popoverForeground: '24 40% 10%',
      primary: '24 95% 53%',
      primaryForeground: '0 0% 100%',
      secondary: '15 50% 25%',
      secondaryForeground: '0 0% 100%',
      muted: '30 20% 96%',
      mutedForeground: '25 20% 40%',
      accent: '45 93% 47%',
      accentForeground: '24 40% 10%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '160 84% 39%',
      successForeground: '0 0% 100%',
      border: '30 20% 88%',
      input: '30 20% 88%',
      ring: '24 95% 53%',
      chart1: '24 95% 53%',
      chart2: '45 93% 47%',
      chart3: '15 50% 25%',
      chart4: '0 80% 55%',
      chart5: '35 85% 60%',
    },
    dark: {
      background: '24 40% 6%',
      foreground: '0 0% 98%',
      card: '24 40% 10%',
      cardForeground: '0 0% 98%',
      popover: '24 40% 10%',
      popoverForeground: '0 0% 98%',
      primary: '24 95% 58%',
      primaryForeground: '24 40% 6%',
      secondary: '15 40% 20%',
      secondaryForeground: '0 0% 98%',
      muted: '24 30% 16%',
      mutedForeground: '25 20% 55%',
      accent: '45 93% 52%',
      accentForeground: '24 40% 6%',
      destructive: '0 63% 31%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 35%',
      successForeground: '0 0% 98%',
      border: '24 30% 18%',
      input: '24 30% 18%',
      ring: '45 93% 52%',
      chart1: '24 95% 60%',
      chart2: '45 93% 55%',
      chart3: '0 80% 60%',
      chart4: '280 65% 55%',
      chart5: '35 85% 65%',
    },
  },
  preview: {
    light: {
      primary: '#F97316',
      secondary: '#5C2D11',
      accent: '#EAB308',
      background: '#FFFFFF',
    },
    dark: {
      primary: '#FB923C',
      secondary: '#3D2418',
      accent: '#FACC15',
      background: '#1A0F0A',
    },
  },
};

/**
 * Midnight - Deep purple theme
 * Primary: Royal Purple
 * Secondary: Deep Violet
 * Accent: Pink
 */
export const midnightTheme: Theme = {
  id: 'midnight',
  name: 'Midnight',
  description: 'Głęboki fioletowo-różowy',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '270 50% 10%',
      card: '0 0% 100%',
      cardForeground: '270 50% 10%',
      popover: '0 0% 100%',
      popoverForeground: '270 50% 10%',
      primary: '271 91% 65%',
      primaryForeground: '0 0% 100%',
      secondary: '270 50% 20%',
      secondaryForeground: '0 0% 100%',
      muted: '270 20% 96%',
      mutedForeground: '270 20% 40%',
      accent: '330 80% 60%',
      accentForeground: '0 0% 100%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '160 84% 39%',
      successForeground: '0 0% 100%',
      border: '270 20% 88%',
      input: '270 20% 88%',
      ring: '271 91% 65%',
      chart1: '271 91% 65%',
      chart2: '330 80% 60%',
      chart3: '270 50% 20%',
      chart4: '300 70% 55%',
      chart5: '250 80% 60%',
    },
    dark: {
      background: '270 50% 5%',
      foreground: '0 0% 98%',
      card: '270 50% 9%',
      cardForeground: '0 0% 98%',
      popover: '270 50% 9%',
      popoverForeground: '0 0% 98%',
      primary: '271 91% 70%',
      primaryForeground: '270 50% 5%',
      secondary: '270 40% 18%',
      secondaryForeground: '0 0% 98%',
      muted: '270 40% 15%',
      mutedForeground: '270 20% 55%',
      accent: '330 80% 65%',
      accentForeground: '270 50% 5%',
      destructive: '0 63% 31%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 35%',
      successForeground: '0 0% 98%',
      border: '270 40% 18%',
      input: '270 40% 18%',
      ring: '330 80% 65%',
      chart1: '271 91% 75%',
      chart2: '330 80% 70%',
      chart3: '300 70% 60%',
      chart4: '200 65% 55%',
      chart5: '250 80% 65%',
    },
  },
  preview: {
    light: {
      primary: '#A855F7',
      secondary: '#2E1065',
      accent: '#EC4899',
      background: '#FFFFFF',
    },
    dark: {
      primary: '#C084FC',
      secondary: '#27184A',
      accent: '#F472B6',
      background: '#0D0517',
    },
  },
};

/**
 * All available themes in the application.
 */
export const prebuiltThemes: Theme[] = [
  apptaxTheme,
  flowbooksTheme,
  oceanTheme,
  forestTheme,
  sunsetTheme,
  midnightTheme,
];

/**
 * Get a theme by its ID.
 * Returns the default theme (AppTax) if not found.
 */
export function getThemeById(themeId: string): Theme {
  return prebuiltThemes.find((theme) => theme.id === themeId) ?? apptaxTheme;
}
