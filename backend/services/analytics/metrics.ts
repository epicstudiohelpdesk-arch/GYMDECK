/**
 * GymDeck Business Intelligence & Analytics - Centralized Metric Catalog
 */

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  domain: 'MEMBERS' | 'MEMBERSHIPS' | 'FINANCIAL' | 'ATTENDANCE' | 'TRAINERS' | 'PT';
  authoritativeTable: string;
  aggregationType: 'COUNT' | 'SUM' | 'AVG' | 'DISTINCT_COUNT' | 'RATIO';
  permissionRequired: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // Members Domain (Authoritative Source: gym_members)
  MEMBERS_TOTAL: {
    id: 'MEMBERS_TOTAL',
    name: 'Total Registered Members',
    description: 'Total non-deleted members registered in the gym tenant.',
    domain: 'MEMBERS',
    authoritativeTable: 'gym_members',
    aggregationType: 'COUNT',
    permissionRequired: 'members.read',
  },
  MEMBERS_ACTIVE: {
    id: 'MEMBERS_ACTIVE',
    name: 'Active Members',
    description: 'Members currently holding active membership status.',
    domain: 'MEMBERS',
    authoritativeTable: 'gym_members',
    aggregationType: 'COUNT',
    permissionRequired: 'members.read',
  },
  MEMBERS_FROZEN: {
    id: 'MEMBERS_FROZEN',
    name: 'Frozen Members',
    description: 'Members whose memberships are temporarily frozen.',
    domain: 'MEMBERS',
    authoritativeTable: 'gym_members',
    aggregationType: 'COUNT',
    permissionRequired: 'members.read',
  },
  MEMBERS_EXPIRED: {
    id: 'MEMBERS_EXPIRED',
    name: 'Expired Members',
    description: 'Members with lapsed memberships who have not renewed.',
    domain: 'MEMBERS',
    authoritativeTable: 'gym_members',
    aggregationType: 'COUNT',
    permissionRequired: 'members.read',
  },
  MEMBERS_NEW_PERIOD: {
    id: 'MEMBERS_NEW_PERIOD',
    name: 'New Member Registrations',
    description: 'Members newly created within the specified reporting period.',
    domain: 'MEMBERS',
    authoritativeTable: 'gym_members',
    aggregationType: 'COUNT',
    permissionRequired: 'members.read',
  },

  // Memberships Domain (Authoritative Source: member_memberships)
  MEMBERSHIPS_ACTIVE: {
    id: 'MEMBERSHIPS_ACTIVE',
    name: 'Active Subscriptions',
    description: 'Valid member subscriptions with status ACTIVE and end_date in future.',
    domain: 'MEMBERSHIPS',
    authoritativeTable: 'member_memberships',
    aggregationType: 'COUNT',
    permissionRequired: 'memberships.read',
  },
  MEMBERSHIPS_EXPIRING_SOON: {
    id: 'MEMBERSHIPS_EXPIRING_SOON',
    name: 'Subscriptions Expiring Soon',
    description: 'Active subscriptions expiring within the next 7 days.',
    domain: 'MEMBERSHIPS',
    authoritativeTable: 'member_memberships',
    aggregationType: 'COUNT',
    permissionRequired: 'memberships.read',
  },
  MEMBERSHIPS_RENEWALS_PERIOD: {
    id: 'MEMBERSHIPS_RENEWALS_PERIOD',
    name: 'Subscription Renewals',
    description: 'Subscriptions created for members who already had a previous subscription.',
    domain: 'MEMBERSHIPS',
    authoritativeTable: 'member_memberships',
    aggregationType: 'COUNT',
    permissionRequired: 'memberships.read',
  },

  // Financial Domain (Authoritative Source: payments ledger)
  REVENUE_GROSS: {
    id: 'REVENUE_GROSS',
    name: 'Gross Completed Payments',
    description: 'Total sum of all COMPLETED payments in period.',
    domain: 'FINANCIAL',
    authoritativeTable: 'payments',
    aggregationType: 'SUM',
    permissionRequired: 'reports.read',
  },
  REVENUE_REFUNDS: {
    id: 'REVENUE_REFUNDS',
    name: 'Total Refunds Issued',
    description: 'Total sum of refund amounts recorded on payments in period.',
    domain: 'FINANCIAL',
    authoritativeTable: 'payments',
    aggregationType: 'SUM',
    permissionRequired: 'reports.read',
  },
  REVENUE_NET: {
    id: 'REVENUE_NET',
    name: 'Net Paid Amount',
    description: 'Gross completed payments minus recorded refunds.',
    domain: 'FINANCIAL',
    authoritativeTable: 'payments',
    aggregationType: 'SUM',
    permissionRequired: 'reports.read',
  },
  PAYMENTS_COUNT: {
    id: 'PAYMENTS_COUNT',
    name: 'Payment Transactions Count',
    description: 'Total number of COMPLETED payment ledger transactions.',
    domain: 'FINANCIAL',
    authoritativeTable: 'payments',
    aggregationType: 'COUNT',
    permissionRequired: 'reports.read',
  },

  // Attendance Domain (Authoritative Source: attendance_logs)
  ATTENDANCE_TOTAL_CHECKINS: {
    id: 'ATTENDANCE_TOTAL_CHECKINS',
    name: 'Total Check-Ins',
    description: 'Total check-in events recorded in the reporting period.',
    domain: 'ATTENDANCE',
    authoritativeTable: 'attendance_logs',
    aggregationType: 'COUNT',
    permissionRequired: 'attendance.read',
  },
  ATTENDANCE_UNIQUE_MEMBERS: {
    id: 'ATTENDANCE_UNIQUE_MEMBERS',
    name: 'Unique Members Attended',
    description: 'Distinct count of individual members who checked in at least once.',
    domain: 'ATTENDANCE',
    authoritativeTable: 'attendance_logs',
    aggregationType: 'DISTINCT_COUNT',
    permissionRequired: 'attendance.read',
  },
  ATTENDANCE_DAILY_AVERAGE: {
    id: 'ATTENDANCE_DAILY_AVERAGE',
    name: 'Average Daily Check-Ins',
    description: 'Average number of check-ins per operational day in period.',
    domain: 'ATTENDANCE',
    authoritativeTable: 'attendance_logs',
    aggregationType: 'AVG',
    permissionRequired: 'attendance.read',
  },

  // Trainer & PT Domain (Authoritative Sources: trainers, pt_packages, pt_sessions, trainer_earnings)
  TRAINERS_ACTIVE: {
    id: 'TRAINERS_ACTIVE',
    name: 'Active Personal Trainers',
    description: 'Total active trainer staff in gym tenant.',
    domain: 'TRAINERS',
    authoritativeTable: 'trainers',
    aggregationType: 'COUNT',
    permissionRequired: 'trainers.read',
  },
  PT_PACKAGES_ACTIVE: {
    id: 'PT_PACKAGES_ACTIVE',
    name: 'Active PT Packages',
    description: 'Personal training packages with remaining sessions.',
    domain: 'PT',
    authoritativeTable: 'pt_packages',
    aggregationType: 'COUNT',
    permissionRequired: 'trainers.read',
  },
  PT_SESSIONS_COMPLETED: {
    id: 'PT_SESSIONS_COMPLETED',
    name: 'Completed PT Sessions',
    description: 'Sessions marked COMPLETED within the reporting period.',
    domain: 'PT',
    authoritativeTable: 'pt_sessions',
    aggregationType: 'COUNT',
    permissionRequired: 'trainers.read',
  },
  PT_SESSIONS_CANCELLED: {
    id: 'PT_SESSIONS_CANCELLED',
    name: 'Cancelled PT Sessions',
    description: 'Sessions marked CANCELLED within the reporting period.',
    domain: 'PT',
    authoritativeTable: 'trainers.read',
    aggregationType: 'COUNT',
    permissionRequired: 'trainers.read',
  },
  TRAINER_EARNINGS_ACCRUED: {
    id: 'TRAINER_EARNINGS_ACCRUED',
    name: 'Total Trainer Earnings Accrued',
    description: 'Authoritative sum of trainer earnings accrued in period.',
    domain: 'TRAINERS',
    authoritativeTable: 'trainer_earnings',
    aggregationType: 'SUM',
    permissionRequired: 'trainers.read',
  },
};
