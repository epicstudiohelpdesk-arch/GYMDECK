/**
 * GymDeck Member Mobile - Client Theme Store
 */

import { create } from 'zustand';
import { FastAppStorage } from '../services/storage/FastAppStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'gymdeck_theme_mode';

const initialTheme = (FastAppStorage.getString(THEME_STORAGE_KEY) as ThemeMode) || 'dark';

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: initialTheme,

  setThemeMode: (themeMode: ThemeMode) => {
    FastAppStorage.setString(THEME_STORAGE_KEY, themeMode);
    set({ themeMode });
  },
}));

export default useThemeStore;
