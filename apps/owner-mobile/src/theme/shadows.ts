/**
 * GymDeck Owner Mobile - Elevation & Shadow Tokens
 *
 * Subtle, layered shadows combined with crisp 1px borders.
 * Cross-platform compatible (iOS shadow props + Android elevation).
 */

import { ViewStyle, Platform } from 'react-native';

export interface ShadowTokens {
  flat: ViewStyle;
  low: ViewStyle;
  medium: ViewStyle;
  high: ViewStyle;
}

export const shadows: ShadowTokens = {
  flat: {
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },

  low: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },

  medium: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  high: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
};
