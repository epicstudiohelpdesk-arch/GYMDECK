/**
 * GymDeck Business Intelligence & Analytics - Type Definitions & API Contracts
 */

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface AnalyticsQueryOptions {
  range?: DateRangePreset;
  from?: string; // ISO date string (YYYY-MM-DD or ISO8601)
  to?: string;   // ISO date string (YYYY-MM-DD or ISO8601)
  timezone?: string; // IANA timezone e.g. "UTC", "America/New_York", "Asia/Kolkata"
  trainerId?: string;
  planId?: string;
}

export interface ResolvedDateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
  timezone: string;
  daysCount: number;
}

export interface TrendDataPoint {
  date: string; // YYYY-MM-DD in gym local date
  value: number;
  label?: string;
}

export interface BreakdownItem {
  category: string;
  count: number;
  percentage: number;
  amount?: number;
}

export interface AnalyticsPeriodSummary {
  from: string;
  to: string;
  preset: string;
  timezone: string;
  daysCount: number;
}

export interface OverviewDashboardResponse {
  period: AnalyticsPeriodSummary;
  generatedAt: string;
  gym: {
    id: string;
    name: string;
    code: string;
  };
  metrics: {
    members: {
      total: number;
      active: number;
      frozen: number;
      expired: number;
      newInPeriod: number;
    };
    financial: {
      grossPaid: number;
      refunds: number;
      netPaid: number;
      transactionCount: number;
      averageTransaction: number;
    };
    attendance: {
      totalCheckins: number;
      uniqueAttendees: number;
      dailyAverage: number;
      todayCheckins: number;
    };
    memberships: {
      activeSubscriptions: number;
      expiringSoon: number;
      renewalsInPeriod: number;
    };
    trainers: {
      activeTrainers: number;
      activePtPackages: number;
      completedSessions: number;
      accruedEarnings: number;
    };
  };
  trends: {
    revenue: TrendDataPoint[];
    attendance: TrendDataPoint[];
    memberRegistrations: TrendDataPoint[];
  };
}

export interface RevenueAnalyticsResponse {
  period: AnalyticsPeriodSummary;
  generatedAt: string;
  summary: {
    grossPayments: number;
    refunds: number;
    netPaid: number;
    paymentCount: number;
    averagePayment: number;
  };
  byPaymentMethod: BreakdownItem[];
  byPaymentType: BreakdownItem[];
  trend: TrendDataPoint[];
}

export interface MembershipAnalyticsResponse {
  period: AnalyticsPeriodSummary;
  generatedAt: string;
  summary: {
    activeMemberships: number;
    frozenMemberships: number;
    expiredMemberships: number;
    expiringIn7Days: number;
    newMembershipsInPeriod: number;
    renewalsInPeriod: number;
  };
  byPlanDistribution: BreakdownItem[];
  byStatusDistribution: BreakdownItem[];
  newSubscriptionsTrend: TrendDataPoint[];
}

export interface AttendanceAnalyticsResponse {
  period: AnalyticsPeriodSummary;
  generatedAt: string;
  summary: {
    totalCheckIns: number;
    uniqueMembersAttended: number;
    averageDailyAttendance: number;
    peakCheckInHour: number | null;
  };
  byWeekday: BreakdownItem[];
  byEntryMethod: BreakdownItem[];
  dailyTrend: TrendDataPoint[];
}

export interface TrainerAnalyticsResponse {
  period: AnalyticsPeriodSummary;
  generatedAt: string;
  summary: {
    activeTrainersCount: number;
    totalClientAssignments: number;
    activePtPackages: number;
    completedSessions: number;
    cancelledSessions: number;
    totalAccruedEarnings: number;
    sessionCompletionRate: number;
  };
  trainerPerformance: Array<{
    trainerId: string;
    fullName: string;
    specialization: string | null;
    activeClients: number;
    completedSessions: number;
    cancelledSessions: number;
    totalEarnings: number;
  }>;
  dailySessionsTrend: TrendDataPoint[];
}

export type ExportReportType = 'MEMBERS' | 'ATTENDANCE' | 'REVENUE' | 'MEMBERSHIPS' | 'TRAINERS';
