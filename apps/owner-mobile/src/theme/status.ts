/**
 * GymDeck Owner Mobile - Semantic Status Language
 *
 * Multi-dimensional status presentation:
 * Never communicates state via color alone. Combines Color + Text + Shape/Icon.
 */

import { lightColors } from './colors';

export type MembershipStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' | 'INACTIVE';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'REFUNDED';
export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT';
export type ConnectivityStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_ERROR' | 'SYNCED';

export interface StatusMeta {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconSymbol?: string;
  accessibleLabel: string;
}

export const membershipStatusConfig: Record<MembershipStatus, StatusMeta> = {
  ACTIVE: {
    label: 'Active',
    textColor: lightColors.successText,
    bgColor: lightColors.successBg,
    borderColor: lightColors.successBorder,
    accessibleLabel: 'Membership is active',
  },
  EXPIRING: {
    label: 'Expiring Soon',
    textColor: lightColors.warningText,
    bgColor: lightColors.warningBg,
    borderColor: lightColors.warningBorder,
    accessibleLabel: 'Membership expires soon',
  },
  EXPIRED: {
    label: 'Expired',
    textColor: lightColors.dangerText,
    bgColor: lightColors.dangerBg,
    borderColor: lightColors.dangerBorder,
    accessibleLabel: 'Membership has expired',
  },
  FROZEN: {
    label: 'Frozen',
    textColor: lightColors.specialText,
    bgColor: lightColors.specialBg,
    borderColor: lightColors.specialBorder,
    accessibleLabel: 'Membership is temporarily frozen',
  },
  INACTIVE: {
    label: 'Inactive',
    textColor: lightColors.textMuted,
    bgColor: lightColors.surfaceSubtle,
    borderColor: lightColors.border,
    accessibleLabel: 'Membership is inactive',
  },
};

export const paymentStatusConfig: Record<PaymentStatus, StatusMeta> = {
  PAID: {
    label: 'Paid',
    textColor: lightColors.successText,
    bgColor: lightColors.successBg,
    borderColor: lightColors.successBorder,
    accessibleLabel: 'Payment settled in full',
  },
  PENDING: {
    label: 'Pending',
    textColor: lightColors.warningText,
    bgColor: lightColors.warningBg,
    borderColor: lightColors.warningBorder,
    accessibleLabel: 'Payment pending confirmation',
  },
  OVERDUE: {
    label: 'Overdue',
    textColor: lightColors.dangerText,
    bgColor: lightColors.dangerBg,
    borderColor: lightColors.dangerBorder,
    accessibleLabel: 'Payment is overdue',
  },
  REFUNDED: {
    label: 'Refunded',
    textColor: lightColors.infoText,
    bgColor: lightColors.infoBg,
    borderColor: lightColors.infoBorder,
    accessibleLabel: 'Payment was refunded',
  },
};

export const attendanceStatusConfig: Record<AttendanceStatus, StatusMeta> = {
  CHECKED_IN: {
    label: 'On Floor',
    textColor: lightColors.successText,
    bgColor: lightColors.successBg,
    borderColor: lightColors.successBorder,
    accessibleLabel: 'Member is currently in the gym',
  },
  CHECKED_OUT: {
    label: 'Checked Out',
    textColor: lightColors.textMuted,
    bgColor: lightColors.surfaceSubtle,
    borderColor: lightColors.border,
    accessibleLabel: 'Member has exited the facility',
  },
};

export const connectivityStatusConfig: Record<ConnectivityStatus, StatusMeta> = {
  ONLINE: {
    label: 'Online',
    textColor: lightColors.successText,
    bgColor: lightColors.successBg,
    borderColor: lightColors.successBorder,
    accessibleLabel: 'Connected to GymDeck cloud',
  },
  OFFLINE: {
    label: 'Offline (Saved Locally)',
    textColor: lightColors.warningText,
    bgColor: lightColors.warningBg,
    borderColor: lightColors.warningBorder,
    accessibleLabel: 'Working offline. Changes are saved safely on this device.',
  },
  SYNCING: {
    label: 'Syncing...',
    textColor: lightColors.infoText,
    bgColor: lightColors.infoBg,
    borderColor: lightColors.infoBorder,
    accessibleLabel: 'Synchronizing latest changes with cloud',
  },
  SYNC_ERROR: {
    label: 'Sync Attention',
    textColor: lightColors.dangerText,
    bgColor: lightColors.dangerBg,
    borderColor: lightColors.dangerBorder,
    accessibleLabel: 'Sync needs attention',
  },
  SYNCED: {
    label: 'Synced just now',
    textColor: lightColors.successText,
    bgColor: lightColors.successBg,
    borderColor: lightColors.successBorder,
    accessibleLabel: 'All records are up to date',
  },
};
