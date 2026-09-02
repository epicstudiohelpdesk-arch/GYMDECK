/**
 * GymDeck Business Intelligence & Analytics - Authoritative Analytics Service
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import { gyms, auditLogs } from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { resolveDateRange, generateDateBuckets, fillTrendGaps } from './dateUtils';
import {
  AnalyticsQueryOptions,
  OverviewDashboardResponse,
  RevenueAnalyticsResponse,
  MembershipAnalyticsResponse,
  AttendanceAnalyticsResponse,
  TrainerAnalyticsResponse,
  ExportReportType,
} from './types';

export class AnalyticsService {
  /**
   * 1. High-Level Executive Dashboard Overview (Single-Flight Aggregated Metrics)
   */
  public async getOverview(gymId: string, options: AnalyticsQueryOptions = {}): Promise<OverviewDashboardResponse> {
    const range = resolveDateRange(options.range, options.from, options.to, options.timezone);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();
    const nowIso = new Date().toISOString();

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    const in7Days = new Date();
    in7Days.setUTCDate(in7Days.getUTCDate() + 7);
    const in7DaysIso = in7Days.toISOString();

    // A. Verify Tenant
    const gym = (
      await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1)
    )[0];
    if (!gym) {
      throw AppError.notFound('Gym tenant record not found.');
    }

    // B. Members Aggregation
    const memberCountsQuery = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_count,
        COUNT(*) FILTER (WHERE membership_status = 'ACTIVE' AND deleted_at IS NULL) AS active_count,
        COUNT(*) FILTER (WHERE membership_status = 'FROZEN' AND deleted_at IS NULL) AS frozen_count,
        COUNT(*) FILTER (WHERE membership_status = 'EXPIRED' AND deleted_at IS NULL) AS expired_count,
        COUNT(*) FILTER (WHERE created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz AND deleted_at IS NULL) AS new_count
      FROM gym_members
      WHERE gym_id = ${gymId}::uuid;
    `);
    const mRow = memberCountsQuery.rows[0] as any || {};

    // C. Financial Aggregation
    const financialQuery = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type != 'REFUND' AND status = 'COMPLETED' THEN amount::numeric ELSE 0 END), 0) AS gross_paid,
        COALESCE(SUM(CASE WHEN type = 'REFUND' AND status = 'COMPLETED' THEN ABS(amount::numeric) ELSE 0 END), 0) AS total_refunds,
        COUNT(CASE WHEN type != 'REFUND' AND status = 'COMPLETED' THEN 1 END) AS tx_count
      FROM payments
      WHERE gym_id = ${gymId}::uuid
        AND paid_at >= ${startIso}::timestamptz
        AND paid_at <= ${endIso}::timestamptz;
    `);
    const fRow = financialQuery.rows[0] as any || {};
    const grossPaid = Number(fRow.gross_paid || 0);
    const refunds = Number(fRow.total_refunds || 0);
    const netPaid = Number((grossPaid - refunds).toFixed(2));
    const txCount = Number(fRow.tx_count || 0);
    const avgTx = txCount > 0 ? Number((grossPaid / txCount).toFixed(2)) : 0;

    // D. Attendance Aggregation
    const attendanceQuery = await db.execute(sql`
      SELECT
        COUNT(*) AS total_checkins,
        COUNT(DISTINCT member_id) AS unique_attendees,
        COUNT(*) FILTER (WHERE check_in_time >= ${todayStartIso}::timestamptz) AS today_checkins
      FROM attendance_logs
      WHERE gym_id = ${gymId}::uuid
        AND check_in_time >= ${startIso}::timestamptz
        AND check_in_time <= ${endIso}::timestamptz;
    `);
    const aRow = attendanceQuery.rows[0] as any || {};
    const totalCheckins = Number(aRow.total_checkins || 0);
    const uniqueAttendees = Number(aRow.unique_attendees || 0);
    const todayCheckins = Number(aRow.today_checkins || 0);
    const dailyAverage = Number((totalCheckins / range.daysCount).toFixed(1));

    // E. Memberships Aggregation
    const membershipQuery = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND end_date >= ${nowIso}::timestamptz) AS active_subs,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND end_date >= ${nowIso}::timestamptz AND end_date <= ${in7DaysIso}::timestamptz) AS expiring_soon,
        COUNT(*) FILTER (WHERE created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz) AS new_subs
      FROM member_memberships
      WHERE gym_id = ${gymId}::uuid;
    `);
    const msRow = membershipQuery.rows[0] as any || {};

    // F. Trainers & PT Aggregation
    const trainerQuery = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM trainers WHERE gym_id = ${gymId}::uuid AND is_active = true AND deleted_at IS NULL) AS active_trainers,
        (SELECT COUNT(*) FROM pt_packages WHERE gym_id = ${gymId}::uuid AND status = 'ACTIVE' AND remaining_sessions > 0) AS active_packages,
        (SELECT COUNT(*) FROM pt_sessions WHERE gym_id = ${gymId}::uuid AND status = 'COMPLETED' AND session_date >= ${startIso}::timestamptz AND session_date <= ${endIso}::timestamptz) AS completed_sessions,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM trainer_earnings WHERE gym_id = ${gymId}::uuid AND created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz) AS accrued_earnings;
    `);
    const tRow = trainerQuery.rows[0] as any || {};

    // G. Trends Generation
    const buckets = generateDateBuckets(range.startDate, range.endDate);

    const revenueTrendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(paid_at AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount::numeric ELSE 0 END), 0) AS value
      FROM payments
      WHERE gym_id = ${gymId}::uuid
        AND paid_at >= ${startIso}::timestamptz
        AND paid_at <= ${endIso}::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `);

    const attendanceTrendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(check_in_time AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COUNT(*) AS value
      FROM attendance_logs
      WHERE gym_id = ${gymId}::uuid
        AND check_in_time >= ${startIso}::timestamptz
        AND check_in_time <= ${endIso}::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `);

    const registrationTrendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COUNT(*) AS value
      FROM gym_members
      WHERE gym_id = ${gymId}::uuid
        AND created_at >= ${startIso}::timestamptz
        AND created_at <= ${endIso}::timestamptz
        AND deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1;
    `);

    const revenueTrend = fillTrendGaps(buckets, revenueTrendQuery.rows as any[]);
    const attendanceTrend = fillTrendGaps(buckets, attendanceTrendQuery.rows as any[]);
    const memberRegistrationsTrend = fillTrendGaps(buckets, registrationTrendQuery.rows as any[]);

    return {
      period: {
        from: range.startDate.toISOString(),
        to: range.endDate.toISOString(),
        preset: range.preset,
        timezone: range.timezone,
        daysCount: range.daysCount,
      },
      generatedAt: new Date().toISOString(),
      gym: {
        id: gym.id,
        name: gym.name,
        code: gym.code,
      },
      metrics: {
        members: {
          total: Number(mRow.total_count || 0),
          active: Number(mRow.active_count || 0),
          frozen: Number(mRow.frozen_count || 0),
          expired: Number(mRow.expired_count || 0),
          newInPeriod: Number(mRow.new_count || 0),
        },
        financial: {
          grossPaid,
          refunds,
          netPaid,
          transactionCount: txCount,
          averageTransaction: avgTx,
        },
        attendance: {
          totalCheckins,
          uniqueAttendees,
          dailyAverage,
          todayCheckins,
        },
        memberships: {
          activeSubscriptions: Number(msRow.active_subs || 0),
          expiringSoon: Number(msRow.expiring_soon || 0),
          renewalsInPeriod: Number(msRow.new_subs || 0),
        },
        trainers: {
          activeTrainers: Number(tRow.active_trainers || 0),
          activePtPackages: Number(tRow.active_packages || 0),
          completedSessions: Number(tRow.completed_sessions || 0),
          accruedEarnings: Number(Number(tRow.accrued_earnings || 0).toFixed(2)),
        },
      },
      trends: {
        revenue: revenueTrend,
        attendance: attendanceTrend,
        memberRegistrations: memberRegistrationsTrend,
      },
    };
  }

  /**
   * 2. Authoritative Revenue & Payment Ledger Analytics
   */
  public async getRevenueAnalytics(gymId: string, options: AnalyticsQueryOptions = {}): Promise<RevenueAnalyticsResponse> {
    const range = resolveDateRange(options.range, options.from, options.to, options.timezone);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();

    const summaryQuery = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type != 'REFUND' AND status = 'COMPLETED' THEN amount::numeric ELSE 0 END), 0) AS gross_payments,
        COALESCE(SUM(CASE WHEN type = 'REFUND' AND status = 'COMPLETED' THEN ABS(amount::numeric) ELSE 0 END), 0) AS total_refunds,
        COUNT(CASE WHEN type != 'REFUND' AND status = 'COMPLETED' THEN 1 END) AS payment_count
      FROM payments
      WHERE gym_id = ${gymId}::uuid
        AND paid_at >= ${startIso}::timestamptz
        AND paid_at <= ${endIso}::timestamptz;
    `);

    const sRow = summaryQuery.rows[0] as any || {};
    const grossPayments = Number(sRow.gross_payments || 0);
    const refunds = Number(sRow.total_refunds || 0);
    const netPaid = Number((grossPayments - refunds).toFixed(2));
    const paymentCount = Number(sRow.payment_count || 0);
    const averagePayment = paymentCount > 0 ? Number((grossPayments / paymentCount).toFixed(2)) : 0;

    // By Payment Method
    const methodQuery = await db.execute(sql`
      SELECT
        payment_method AS category,
        COUNT(*) AS count,
        COALESCE(SUM(amount::numeric), 0) AS amount
      FROM payments
      WHERE gym_id = ${gymId}::uuid
        AND type != 'REFUND'
        AND status = 'COMPLETED'
        AND paid_at >= ${startIso}::timestamptz
        AND paid_at <= ${endIso}::timestamptz
      GROUP BY payment_method
      ORDER BY amount DESC;
    `);

    const byPaymentMethod = (methodQuery.rows as any[]).map((r) => ({
      category: r.category || 'OTHER',
      count: Number(r.count || 0),
      amount: Number(Number(r.amount || 0).toFixed(2)),
      percentage: grossPayments > 0 ? Number(((Number(r.amount || 0) / grossPayments) * 100).toFixed(1)) : 0,
    }));

    // By Payment Type
    const typeQuery = await db.execute(sql`
      SELECT
        type AS category,
        COUNT(*) AS count,
        COALESCE(SUM(amount::numeric), 0) AS amount
      FROM payments
      WHERE gym_id = ${gymId}::uuid
        AND type != 'REFUND'
        AND status = 'COMPLETED'
        AND paid_at >= ${startIso}::timestamptz
        AND paid_at <= ${endIso}::timestamptz
      GROUP BY type
      ORDER BY amount DESC;
    `);

    const byPaymentType = (typeQuery.rows as any[]).map((r) => ({
      category: r.category || 'MEMBERSHIP_FEE',
      count: Number(r.count || 0),
      amount: Number(Number(r.amount || 0).toFixed(2)),
      percentage: grossPayments > 0 ? Number(((Number(r.amount || 0) / grossPayments) * 100).toFixed(1)) : 0,
    }));

    // Trend Series
    const buckets = generateDateBuckets(range.startDate, range.endDate);
    const trendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(paid_at AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount::numeric ELSE 0 END), 0) AS value
      FROM payments
      WHERE gym_id = ${gymId}::uuid
        AND paid_at >= ${startIso}::timestamptz
        AND paid_at <= ${endIso}::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `);
    const trend = fillTrendGaps(buckets, trendQuery.rows as any[]);

    return {
      period: {
        from: range.startDate.toISOString(),
        to: range.endDate.toISOString(),
        preset: range.preset,
        timezone: range.timezone,
        daysCount: range.daysCount,
      },
      generatedAt: new Date().toISOString(),
      summary: {
        grossPayments,
        refunds,
        netPaid,
        paymentCount,
        averagePayment,
      },
      byPaymentMethod,
      byPaymentType,
      trend,
    };
  }

  /**
   * 3. Authoritative Membership & Subscription Lifecycle Analytics
   */
  public async getMembershipAnalytics(gymId: string, options: AnalyticsQueryOptions = {}): Promise<MembershipAnalyticsResponse> {
    const range = resolveDateRange(options.range, options.from, options.to, options.timezone);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();
    const nowIso = new Date().toISOString();

    const in7Days = new Date();
    in7Days.setUTCDate(in7Days.getUTCDate() + 7);
    const in7DaysIso = in7Days.toISOString();

    const summaryQuery = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND end_date >= ${nowIso}::timestamptz) AS active_count,
        COUNT(*) FILTER (WHERE status = 'FROZEN') AS frozen_count,
        COUNT(*) FILTER (WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND end_date < ${nowIso}::timestamptz)) AS expired_count,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND end_date >= ${nowIso}::timestamptz AND end_date <= ${in7DaysIso}::timestamptz) AS expiring_soon,
        COUNT(*) FILTER (WHERE created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz) AS new_in_period
      FROM member_memberships
      WHERE gym_id = ${gymId}::uuid;
    `);
    const sRow = summaryQuery.rows[0] as any || {};

    // By Plan Distribution
    const planQuery = await db.execute(sql`
      SELECT
        COALESCE(p.plan_name, 'Unknown Plan') AS category,
        COUNT(m.id) AS count
      FROM member_memberships m
      LEFT JOIN membership_plans p ON m.plan_id = p.id
      WHERE m.gym_id = ${gymId}::uuid
      GROUP BY p.plan_name
      ORDER BY count DESC;
    `);

    const totalMemberships = (planQuery.rows as any[]).reduce((sum, r) => sum + Number(r.count || 0), 0);
    const byPlanDistribution = (planQuery.rows as any[]).map((r) => ({
      category: r.category,
      count: Number(r.count || 0),
      percentage: totalMemberships > 0 ? Number(((Number(r.count || 0) / totalMemberships) * 100).toFixed(1)) : 0,
    }));

    // By Status Distribution
    const statusQuery = await db.execute(sql`
      SELECT
        status AS category,
        COUNT(*) AS count
      FROM member_memberships
      WHERE gym_id = ${gymId}::uuid
      GROUP BY status
      ORDER BY count DESC;
    `);

    const byStatusDistribution = (statusQuery.rows as any[]).map((r) => ({
      category: r.category,
      count: Number(r.count || 0),
      percentage: totalMemberships > 0 ? Number(((Number(r.count || 0) / totalMemberships) * 100).toFixed(1)) : 0,
    }));

    // New Subscriptions Trend
    const buckets = generateDateBuckets(range.startDate, range.endDate);
    const trendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(created_at AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COUNT(*) AS value
      FROM member_memberships
      WHERE gym_id = ${gymId}::uuid
        AND created_at >= ${startIso}::timestamptz
        AND created_at <= ${endIso}::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `);
    const newSubscriptionsTrend = fillTrendGaps(buckets, trendQuery.rows as any[]);

    return {
      period: {
        from: range.startDate.toISOString(),
        to: range.endDate.toISOString(),
        preset: range.preset,
        timezone: range.timezone,
        daysCount: range.daysCount,
      },
      generatedAt: new Date().toISOString(),
      summary: {
        activeMemberships: Number(sRow.active_count || 0),
        frozenMemberships: Number(sRow.frozen_count || 0),
        expiredMemberships: Number(sRow.expired_count || 0),
        expiringIn7Days: Number(sRow.expiring_soon || 0),
        newMembershipsInPeriod: Number(sRow.new_in_period || 0),
        renewalsInPeriod: Number(sRow.new_in_period || 0),
      },
      byPlanDistribution,
      byStatusDistribution,
      newSubscriptionsTrend,
    };
  }

  /**
   * 4. Authoritative Attendance Analytics & Foot-Traffic Patterns
   */
  public async getAttendanceAnalytics(gymId: string, options: AnalyticsQueryOptions = {}): Promise<AttendanceAnalyticsResponse> {
    const range = resolveDateRange(options.range, options.from, options.to, options.timezone);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();

    const summaryQuery = await db.execute(sql`
      SELECT
        COUNT(*) AS total_checkins,
        COUNT(DISTINCT member_id) AS unique_members,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM check_in_time AT TIME ZONE ${range.timezone})) AS peak_hour
      FROM attendance_logs
      WHERE gym_id = ${gymId}::uuid
        AND check_in_time >= ${startIso}::timestamptz
        AND check_in_time <= ${endIso}::timestamptz;
    `);

    const sRow = summaryQuery.rows[0] as any || {};
    const totalCheckIns = Number(sRow.total_checkins || 0);
    const uniqueMembersAttended = Number(sRow.unique_members || 0);
    const averageDailyAttendance = Number((totalCheckIns / range.daysCount).toFixed(1));
    const peakCheckInHour = sRow.peak_hour !== null && sRow.peak_hour !== undefined ? Number(sRow.peak_hour) : null;

    // By Day of Week (0=Sun, 1=Mon, ..., 6=Sat)
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayQuery = await db.execute(sql`
      SELECT
        EXTRACT(DOW FROM check_in_time AT TIME ZONE ${range.timezone})::int AS dow,
        COUNT(*) AS count
      FROM attendance_logs
      WHERE gym_id = ${gymId}::uuid
        AND check_in_time >= ${startIso}::timestamptz
        AND check_in_time <= ${endIso}::timestamptz
      GROUP BY dow
      ORDER BY dow;
    `);

    const byWeekday = weekdayNames.map((name, index) => {
      const match = (weekdayQuery.rows as any[]).find((r) => r.dow === index);
      const count = Number(match?.count || 0);
      return {
        category: name,
        count,
        percentage: totalCheckIns > 0 ? Number(((count / totalCheckIns) * 100).toFixed(1)) : 0,
      };
    });

    // By Entry Method
    const methodQuery = await db.execute(sql`
      SELECT
        entry_method AS category,
        COUNT(*) AS count
      FROM attendance_logs
      WHERE gym_id = ${gymId}::uuid
        AND check_in_time >= ${startIso}::timestamptz
        AND check_in_time <= ${endIso}::timestamptz
      GROUP BY entry_method
      ORDER BY count DESC;
    `);

    const byEntryMethod = (methodQuery.rows as any[]).map((r) => ({
      category: r.category || 'QR_DYNAMIC',
      count: Number(r.count || 0),
      percentage: totalCheckIns > 0 ? Number(((Number(r.count || 0) / totalCheckIns) * 100).toFixed(1)) : 0,
    }));

    // Daily Trend
    const buckets = generateDateBuckets(range.startDate, range.endDate);
    const trendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(check_in_time AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COUNT(*) AS value
      FROM attendance_logs
      WHERE gym_id = ${gymId}::uuid
        AND check_in_time >= ${startIso}::timestamptz
        AND check_in_time <= ${endIso}::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `);
    const dailyTrend = fillTrendGaps(buckets, trendQuery.rows as any[]);

    return {
      period: {
        from: range.startDate.toISOString(),
        to: range.endDate.toISOString(),
        preset: range.preset,
        timezone: range.timezone,
        daysCount: range.daysCount,
      },
      generatedAt: new Date().toISOString(),
      summary: {
        totalCheckIns,
        uniqueMembersAttended,
        averageDailyAttendance,
        peakCheckInHour,
      },
      byWeekday,
      byEntryMethod,
      dailyTrend,
    };
  }

  /**
   * 5. Authoritative Trainer & PT Analytics
   */
  public async getTrainerAnalytics(gymId: string, options: AnalyticsQueryOptions = {}): Promise<TrainerAnalyticsResponse> {
    const range = resolveDateRange(options.range, options.from, options.to, options.timezone);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();

    const summaryQuery = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM trainers WHERE gym_id = ${gymId}::uuid AND is_active = true AND deleted_at IS NULL) AS active_trainers,
        (SELECT COUNT(*) FROM trainer_assignments WHERE gym_id = ${gymId}::uuid AND status = 'ACTIVE') AS total_assignments,
        (SELECT COUNT(*) FROM pt_packages WHERE gym_id = ${gymId}::uuid AND status = 'ACTIVE' AND remaining_sessions > 0) AS active_packages,
        (SELECT COUNT(*) FROM pt_sessions WHERE gym_id = ${gymId}::uuid AND status = 'COMPLETED' AND session_date >= ${startIso}::timestamptz AND session_date <= ${endIso}::timestamptz) AS completed_sessions,
        (SELECT COUNT(*) FROM pt_sessions WHERE gym_id = ${gymId}::uuid AND status = 'CANCELLED' AND session_date >= ${startIso}::timestamptz AND session_date <= ${endIso}::timestamptz) AS cancelled_sessions,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM trainer_earnings WHERE gym_id = ${gymId}::uuid AND created_at >= ${startIso}::timestamptz AND created_at <= ${endIso}::timestamptz) AS total_earnings;
    `);

    const sRow = summaryQuery.rows[0] as any || {};
    const activeTrainersCount = Number(sRow.active_trainers || 0);
    const totalClientAssignments = Number(sRow.total_assignments || 0);
    const activePtPackages = Number(sRow.active_packages || 0);
    const completedSessions = Number(sRow.completed_sessions || 0);
    const cancelledSessions = Number(sRow.cancelled_sessions || 0);
    const totalAccruedEarnings = Number(Number(sRow.total_earnings || 0).toFixed(2));
    const totalSessionsScheduled = completedSessions + cancelledSessions;
    const sessionCompletionRate = totalSessionsScheduled > 0 ? Number(((completedSessions / totalSessionsScheduled) * 100).toFixed(1)) : 100;

    // Per Trainer Performance
    const performanceQuery = await db.execute(sql`
      SELECT
        t.id AS trainer_id,
        t.full_name,
        t.specialization,
        COUNT(DISTINCT a.member_id) FILTER (WHERE a.status = 'ACTIVE') AS active_clients,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'COMPLETED' AND s.session_date >= ${startIso}::timestamptz AND s.session_date <= ${endIso}::timestamptz) AS completed_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'CANCELLED' AND s.session_date >= ${startIso}::timestamptz AND s.session_date <= ${endIso}::timestamptz) AS cancelled_sessions,
        COALESCE(SUM(e.amount::numeric) FILTER (WHERE e.created_at >= ${startIso}::timestamptz AND e.created_at <= ${endIso}::timestamptz), 0) AS total_earnings
      FROM trainers t
      LEFT JOIN trainer_assignments a ON a.trainer_id = t.id AND a.gym_id = ${gymId}::uuid
      LEFT JOIN pt_sessions s ON s.trainer_id = t.id AND s.gym_id = ${gymId}::uuid
      LEFT JOIN trainer_earnings e ON e.trainer_id = t.id AND e.gym_id = ${gymId}::uuid
      WHERE t.gym_id = ${gymId}::uuid
        AND t.deleted_at IS NULL
      GROUP BY t.id, t.full_name, t.specialization
      ORDER BY completed_sessions DESC;
    `);

    const trainerPerformance = (performanceQuery.rows as any[]).map((r) => ({
      trainerId: r.trainer_id,
      fullName: r.full_name,
      specialization: r.specialization || null,
      activeClients: Number(r.active_clients || 0),
      completedSessions: Number(r.completed_sessions || 0),
      cancelledSessions: Number(r.cancelled_sessions || 0),
      totalEarnings: Number(Number(r.total_earnings || 0).toFixed(2)),
    }));

    // Daily Sessions Trend
    const buckets = generateDateBuckets(range.startDate, range.endDate);
    const trendQuery = await db.execute(sql`
      SELECT
        TO_CHAR(session_date AT TIME ZONE ${range.timezone}, 'YYYY-MM-DD') AS date,
        COUNT(*) AS value
      FROM pt_sessions
      WHERE gym_id = ${gymId}::uuid
        AND status = 'COMPLETED'
        AND session_date >= ${startIso}::timestamptz
        AND session_date <= ${endIso}::timestamptz
      GROUP BY 1
      ORDER BY 1;
    `);
    const dailySessionsTrend = fillTrendGaps(buckets, trendQuery.rows as any[]);

    return {
      period: {
        from: range.startDate.toISOString(),
        to: range.endDate.toISOString(),
        preset: range.preset,
        timezone: range.timezone,
        daysCount: range.daysCount,
      },
      generatedAt: new Date().toISOString(),
      summary: {
        activeTrainersCount,
        totalClientAssignments,
        activePtPackages,
        completedSessions,
        cancelledSessions,
        totalAccruedEarnings,
        sessionCompletionRate,
      },
      trainerPerformance,
      dailySessionsTrend,
    };
  }

  /**
   * 6. Secure Bounded CSV Report Export (With Spreadsheet Injection Defense)
   */
  public async exportReport(
    gymId: string,
    reportType: ExportReportType,
    options: AnalyticsQueryOptions = {},
    actorUserId?: string
  ): Promise<{ filename: string; contentType: string; data: string; rowCount: number }> {
    const range = resolveDateRange(options.range, options.from, options.to, options.timezone);
    const startIso = range.startDate.toISOString();
    const endIso = range.endDate.toISOString();
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');

    let rows: Array<Record<string, any>> = [];
    let filename = `gymdeck_${reportType.toLowerCase()}_${timestampStr}.csv`;

    switch (reportType) {
      case 'MEMBERS': {
        const result = await db.execute(sql`
          SELECT
            member_code,
            full_name,
            phone,
            email,
            membership_status,
            created_at
          FROM gym_members
          WHERE gym_id = ${gymId}::uuid
            AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 5000;
        `);
        rows = result.rows as any[];
        break;
      }
      case 'ATTENDANCE': {
        const result = await db.execute(sql`
          SELECT
            a.check_in_time,
            m.member_code,
            m.full_name,
            a.entry_method
          FROM attendance_logs a
          JOIN gym_members m ON a.member_id = m.id
          WHERE a.gym_id = ${gymId}::uuid
            AND a.check_in_time >= ${startIso}::timestamptz
            AND a.check_in_time <= ${endIso}::timestamptz
          ORDER BY a.check_in_time DESC
          LIMIT 5000;
        `);
        rows = result.rows as any[];
        break;
      }
      case 'REVENUE': {
        const result = await db.execute(sql`
          SELECT
            p.paid_at,
            p.receipt_number,
            m.full_name AS member_name,
            p.amount,
            p.payment_method,
            p.status,
            p.type
          FROM payments p
          JOIN gym_members m ON p.member_id = m.id
          WHERE p.gym_id = ${gymId}::uuid
            AND p.paid_at >= ${startIso}::timestamptz
            AND p.paid_at <= ${endIso}::timestamptz
          ORDER BY p.paid_at DESC
          LIMIT 5000;
        `);
        rows = result.rows as any[];
        break;
      }
      case 'MEMBERSHIPS': {
        const result = await db.execute(sql`
          SELECT
            m.full_name AS member_name,
            p.plan_name,
            ms.status,
            ms.start_date,
            ms.end_date,
            ms.price_at_purchase
          FROM member_memberships ms
          JOIN gym_members m ON ms.member_id = m.id
          JOIN membership_plans p ON ms.plan_id = p.id
          WHERE ms.gym_id = ${gymId}::uuid
          ORDER BY ms.created_at DESC
          LIMIT 5000;
        `);
        rows = result.rows as any[];
        break;
      }
      case 'TRAINERS': {
        const result = await db.execute(sql`
          SELECT
            full_name,
            phone,
            specialization,
            commission_type,
            commission_rate,
            is_active
          FROM trainers
          WHERE gym_id = ${gymId}::uuid
            AND deleted_at IS NULL
          ORDER BY full_name ASC
          LIMIT 1000;
        `);
        rows = result.rows as any[];
        break;
      }
      default:
        throw AppError.validation(`Unsupported export report type: ${reportType}`);
    }

    // Format to CSV with Spreadsheet Formula Injection Defense
    const csvContent = this.formatCsvWithSafety(rows);

    // Audit Log the Export Event
    await db.insert(auditLogs).values({
      gymId,
      actorType: 'OWNER',
      action: 'ANALYTICS_REPORT_EXPORTED',
      resource: 'analytics_export',
      metadata: JSON.stringify({
        reportType,
        range: range.preset,
        rowCount: rows.length,
        actorUserId,
      }),
    });

    return {
      filename,
      contentType: 'text/csv; charset=utf-8',
      data: csvContent,
      rowCount: rows.length,
    };
  }

  /**
   * Escape and format JSON rows into standard CSV with Formula Injection Prevention
   */
  private formatCsvWithSafety(rows: Array<Record<string, any>>): string {
    if (rows.length === 0) {
      return 'No data available for the selected criteria\n';
    }

    const headers = Object.keys(rows[0]!);
    const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');

    const dataLines = rows.map((row) => {
      return headers
        .map((header) => {
          let val = row[header];
          if (val === null || val === undefined) {
            return '""';
          }
          if (val instanceof Date) {
            val = val.toISOString();
          } else {
            val = String(val);
          }

          // Formula injection defense: prefix dangerous leading characters with single quote
          if (/^[=+\-@\t\r]/.test(val)) {
            val = `'${val}`;
          }

          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    return [headerLine, ...dataLines].join('\n') + '\n';
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
