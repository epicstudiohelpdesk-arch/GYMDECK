/**
 * GymDeck Owner Mobile - Spacing & Layout Tokens
 *
 * Built on an 8pt/4pt sub-grid system optimized for mobile ergonomics.
 * Standardizes touch targets to minimum 44pt for accessible one-handed use.
 */

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
  '6xl': 64,
} as const;

export const layout = {
  // Page & Containers
  pagePaddingHorizontal: 16,
  pagePaddingVertical: 12,
  sectionGap: 20,
  cardPadding: 16,
  cardPaddingCompact: 12,
  itemGap: 10,
  formFieldGap: 14,

  // Heights & Sizing
  touchTargetMin: 44,       // Apple HIG & Material design standard (44x44pt)
  headerHeight: 56,
  bottomNavHeight: 72,
  searchBarHeight: 46,
  buttonHeight: 48,
  buttonHeightSmall: 36,
  inputHeight: 48,

  // Bottom Sheet
  sheetHandleWidth: 36,
  sheetHandleHeight: 4,
  sheetTopRadius: 24,
  sheetPaddingHorizontal: 20,
} as const;
