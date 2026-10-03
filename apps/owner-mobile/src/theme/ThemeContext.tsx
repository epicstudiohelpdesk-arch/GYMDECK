/**
 * GymDeck Owner Mobile - Theme Context & Provider
 *
 * HARD REQUIREMENT:
 * The canonical and primary Owner Mobile experience is GYMDECK LIGHT THEME.
 * First launch → Light Theme
 * No saved preference → Light Theme
 * New device → Light Theme
 * New account → Light Theme
 *
 * Only explicit user preference switches to Dark Theme.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { lightTheme, darkTheme, ThemeTokens } from './tokens';
import { ThemeColors } from './colors';
import { TypographyTokens } from './typography';
import { spacing, layout } from './spacing';
import { radii, semanticRadii } from './radii';
import { ShadowTokens } from './shadows';

export interface ThemeContextValue {
  theme: ThemeTokens;
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: typeof spacing;
  layout: typeof layout;
  radii: typeof radii;
  semanticRadii: typeof semanticRadii;
  shadows: ShadowTokens;
  isDark: boolean;
  mode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  colors: lightTheme.colors,
  typography: lightTheme.typography,
  spacing: lightTheme.spacing,
  layout: lightTheme.layout,
  radii: lightTheme.radii,
  semanticRadii: lightTheme.semanticRadii,
  shadows: lightTheme.shadows,
  isDark: false,
  mode: 'light',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: 'light' | 'dark';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'light', // Light Theme is canonical primary default
}) => {
  const [mode, setMode] = useState<'light' | 'dark'>(initialMode);

  const theme = useMemo<ThemeTokens>(() => {
    return mode === 'dark' ? darkTheme : lightTheme;
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    layout: theme.layout,
    radii: theme.radii,
    semanticRadii: theme.semanticRadii,
    shadows: theme.shadows,
    isDark: mode === 'dark',
    mode,
    setThemeMode: setMode,
    toggleTheme: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
  }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Universal hook to access semantic design tokens
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
