/**
 * GymDeck Member Mobile - Design Tokens & Theme Definitions
 */

export const colors = {
  brand: {
    primary: '#FF5E62',
    primaryHover: '#E04E52',
    primaryLight: '#FFE5E6',
    secondary: '#FF9966',
    gradientStart: '#FF5E62',
    gradientEnd: '#FF9966',
  },
  dark: {
    background: '#090A0F',
    surface: '#12141D',
    surfaceSubtle: '#1A1D29',
    surfaceElevated: '#242838',
    border: '#2A2E3D',
    borderSubtle: '#1E212E',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceElevated: '#E2E8F0',
    border: '#CBD5E1',
    borderSubtle: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
  },
  status: {
    success: '#10B981',
    successBg: '#064E3B',
    warning: '#F59E0B',
    warningBg: '#78350F',
    error: '#EF4444',
    errorBg: '#7F1D1D',
    info: '#3B82F6',
    infoBg: '#1E3A8A',
  },
};

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  fontFamilies: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    display: 'System',
  },
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
  },
  lineHeights: {
    xs: 14,
    sm: 18,
    base: 22,
    md: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 42,
  },
};
