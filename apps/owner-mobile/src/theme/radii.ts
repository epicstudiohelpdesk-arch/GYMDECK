/**
 * GymDeck Owner Mobile - Corner Radius Tokens
 *
 * Professional SaaS aesthetic: clean geometric curves without exaggerated bubbles.
 */

export const radii = {
  none: 0,
  xs: 4,     // Micro indicators, small tags
  sm: 8,     // Inner items, status badges
  md: 12,    // Inputs, standard buttons, list items
  lg: 16,    // Standard cards, containers
  xl: 20,    // Hero cards, highlighted sections
  xxl: 24,   // Bottom sheets top radius
  full: 9999,// Circular avatars, full-round pills
} as const;

export const semanticRadii = {
  input: radii.md,
  card: radii.lg,
  button: radii.md,
  buttonSmall: radii.sm,
  statusBadge: radii.sm,
  filterPill: radii.full,
  bottomSheet: radii.xxl,
  avatar: radii.full,
} as const;
