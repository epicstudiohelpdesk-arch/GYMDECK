/**
 * GymDeck Owner Mobile - Semantic Typography Tokens
 *
 * Establishes strong visual hierarchy matching GymDeck SaaS product identity.
 * Numbers dominate KPI labels (e.g. ₹84,500 over "Revenue").
 */

import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export interface TypographyTokens {
  display: TextStyle;
  screenTitle: TextStyle;
  sectionTitle: TextStyle;
  cardTitle: TextStyle;
  body: TextStyle;
  bodyMedium: TextStyle;
  bodyBold: TextStyle;
  bodySecondary: TextStyle;
  caption: TextStyle;
  captionBold: TextStyle;
  button: TextStyle;
  buttonSmall: TextStyle;
  navLabel: TextStyle;
  kpiNumber: TextStyle;
  kpiNumberSmall: TextStyle;
  kpiLabel: TextStyle;
  formLabel: TextStyle;
  inputText: TextStyle;
  helperText: TextStyle;
  errorText: TextStyle;
  badgeText: TextStyle;
}

export const typography: TypographyTokens = {
  // Hero & Displays
  display: {
    fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  screenTitle: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Content & Body
  body: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bodyBold: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  bodySecondary: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  caption: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
  },
  captionBold: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },

  // Interactive Elements
  button: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  buttonSmall: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  navLabel: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },

  // Executive Numbers (Dominant Hierarchy)
  kpiNumber: {
    fontFamily,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiNumberSmall: {
    fontFamily,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Forms
  formLabel: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  inputText: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  helperText: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
  },
  errorText: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },

  // Badges & Pills
  badgeText: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
};
