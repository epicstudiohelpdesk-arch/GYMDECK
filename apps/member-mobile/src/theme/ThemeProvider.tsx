/**
 * GymDeck Member Mobile - Theme Provider & Hook
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors, spacing, radii, typography } from './tokens';
import { useThemeStore, ThemeMode } from '../store/themeStore';

export interface ThemeContextValue {
  mode: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: {
    brand: typeof colors.brand;
    status: typeof colors.status;
    background: string;
    surface: string;
    surfaceSubtle: string;
    surfaceElevated: string;
    border: string;
    borderSubtle: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode } = useThemeStore();

  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const activeColors = resolvedMode === 'dark' ? colors.dark : colors.light;

  const value: ThemeContextValue = useMemo(() => ({
    mode: resolvedMode,
    themeMode,
    setThemeMode,
    colors: {
      brand: colors.brand,
      status: colors.status,
      ...activeColors,
    },
    spacing,
    radii,
    typography,
  }), [resolvedMode, themeMode, setThemeMode, activeColors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
