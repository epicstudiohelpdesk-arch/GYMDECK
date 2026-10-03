/**
 * GymDeck Owner Mobile - Semantic Color Tokens
 *
 * Light-First Canonical Foundation:
 * - Primary interaction: GymDeck Blue (#2563EB)
 * - Base background: #F8FAFC (Slate 50)
 * - Primary surface: #FFFFFF
 * - Primary text: #0F172A (Deep Slate / Dark Navy)
 * - Secondary text: #64748B (Slate 500)
 * - Muted text: #94A3B8 (Slate 400)
 * - Border: #E2E8F0 (Slate 200)
 */

export interface ThemeColors {
  // Brand & Interactive
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  primarySoft: string;
  primaryBorder: string;
  onPrimary: string;

  // Backgrounds & Surfaces
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  surfaceHighlight: string;

  // Text Hierarchy
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textOnPrimary: string;
  textInverse: string;

  // Borders & Dividers
  border: string;
  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;

  // Semantic Status Colors
  success: string;
  successBg: string;
  successBorder: string;
  successText: string;

  warning: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;

  danger: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;

  info: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;

  special: string;
  specialBg: string;
  specialBorder: string;
  specialText: string;

  // Overlays & Backdrop
  overlay: string;
  cardShadow: string;
}

/**
 * Canonical Primary Experience: GymDeck Light Theme
 */
export const lightColors: ThemeColors = {
  // Brand (GymDeck Orange)
  primary: '#EA4303',          // GymDeck Primary Orange
  primaryHover: '#DF3800',     // Deep Orange
  primaryPressed: '#C83400',   // Active Pressed
  primarySoft: '#FFF4EE',      // Warm Peach 50 tint
  primaryBorder: '#FED7C7',    // Peach 200 border
  onPrimary: '#FFFFFF',

  // Surfaces
  background: '#F8F9FA',       // Soft warm/neutral light background
  surface: '#FFFFFF',          // Pure White
  surfaceSubtle: '#F1F5F9',     // Slate 100
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#FFF4EE',

  // Typography
  textPrimary: '#0F172A',      // Slate 900 (Dark Navy / Near Black)
  textSecondary: '#64748B',    // Slate 500
  textMuted: '#94A3B8',        // Slate 400
  textDisabled: '#CBD5E1',     // Slate 300
  textOnPrimary: '#FFFFFF',
  textInverse: '#F8F9FA',

  // Borders
  border: '#E2E8F0',           // Slate 200
  borderSubtle: '#F1F5F9',
  borderStrong: '#CBD5E1',     // Slate 300
  borderFocus: '#EA4303',

  // Statuses
  success: '#10B981',          // Emerald 500
  successBg: '#ECFDF5',        // Emerald 50
  successBorder: '#A7F3D0',    // Emerald 200
  successText: '#065F46',      // Emerald 800

  warning: '#F59E0B',          // Amber 500
  warningBg: '#FFFBEB',        // Amber 50
  warningBorder: '#FDE68A',    // Amber 200
  warningText: '#92400E',      // Amber 800

  danger: '#EF4444',           // Red 500
  dangerBg: '#FEF2F2',         // Red 50
  dangerBorder: '#FECACA',     // Red 200
  dangerText: '#991B1B',       // Red 800

  info: '#2563EB',             // Blue 600
  infoBg: '#EFF6FF',           // Blue 50
  infoBorder: '#BFDBFE',       // Blue 200
  infoText: '#1E40AF',         // Blue 800

  special: '#7C3AED',          // Violet 600 (Special/Pro)
  specialBg: '#F5F3FF',        // Violet 50
  specialBorder: '#DDD6FE',    // Violet 200
  specialText: '#5B21B6',      // Violet 800

  // Backdrop
  overlay: 'rgba(15, 23, 42, 0.45)',
  cardShadow: 'rgba(15, 23, 42, 0.06)',
};

/**
 * Secondary Theme (Semantic mapping ready for explicit user preference)
 */
export const darkColors: ThemeColors = {
  primary: '#FF5722',
  primaryHover: '#EA4303',
  primaryPressed: '#DF3800',
  primarySoft: 'rgba(234, 67, 3, 0.15)',
  primaryBorder: 'rgba(234, 67, 3, 0.3)',
  onPrimary: '#FFFFFF',

  background: '#0B0F19',
  surface: '#131825',
  surfaceSubtle: '#1C2436',
  surfaceElevated: '#1F293D',
  surfaceHighlight: 'rgba(234, 67, 3, 0.12)',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  textOnPrimary: '#FFFFFF',
  textInverse: '#0F172A',

  border: '#1E293B',
  borderSubtle: '#162032',
  borderStrong: '#334155',
  borderFocus: '#FF5722',

  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  successText: '#34D399',

  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  warningText: '#FBBF24',

  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
  dangerText: '#F87171',

  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  infoBorder: 'rgba(59, 130, 246, 0.3)',
  infoText: '#93C5FD',

  special: '#8B5CF6',
  specialBg: 'rgba(139, 92, 246, 0.15)',
  specialBorder: 'rgba(139, 92, 246, 0.3)',
  specialText: '#C4B5FD',

  overlay: 'rgba(0, 0, 0, 0.7)',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
};
