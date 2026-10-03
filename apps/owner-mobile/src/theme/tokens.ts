/**
 * GymDeck Owner Mobile - Consolidated Design Tokens
 *
 * Central export of all semantic tokens.
 */

import { lightColors, darkColors, ThemeColors } from './colors';
import { typography, TypographyTokens } from './typography';
import { spacing, layout } from './spacing';
import { radii, semanticRadii } from './radii';
import { shadows, ShadowTokens } from './shadows';
import {
  membershipStatusConfig,
  paymentStatusConfig,
  attendanceStatusConfig,
  connectivityStatusConfig,
} from './status';

export interface ThemeTokens {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: typeof spacing;
  layout: typeof layout;
  radii: typeof radii;
  semanticRadii: typeof semanticRadii;
  shadows: ShadowTokens;
  status: {
    membership: typeof membershipStatusConfig;
    payment: typeof paymentStatusConfig;
    attendance: typeof attendanceStatusConfig;
    connectivity: typeof connectivityStatusConfig;
  };
}

export const lightTheme: ThemeTokens = {
  mode: 'light',
  colors: lightColors,
  typography,
  spacing,
  layout,
  radii,
  semanticRadii,
  shadows,
  status: {
    membership: membershipStatusConfig,
    payment: paymentStatusConfig,
    attendance: attendanceStatusConfig,
    connectivity: connectivityStatusConfig,
  },
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  colors: darkColors,
  typography,
  spacing,
  layout,
  radii,
  semanticRadii,
  shadows,
  status: {
    membership: membershipStatusConfig,
    payment: paymentStatusConfig,
    attendance: attendanceStatusConfig,
    connectivity: connectivityStatusConfig,
  },
};
