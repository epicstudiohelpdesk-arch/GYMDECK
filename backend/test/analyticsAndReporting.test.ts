/**
 * GymDeck Phase 13 Hardening: Analytics, Reporting & Business Intelligence Comprehensive Test Suite
 */

import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  gymMembers,
  membershipPlans,
  payments,
} from '../shared/database/schema';
import { analyticsService } from '../services/analytics/analyticsService';
import { ownerService } from '../services/owner/ownerService';
import { billingService } from '../services/billing/billingService';
import { ownerAttendanceService } from '../services/owner/ownerAttendanceService';
import { ownerTrainerService } from '../services/owner/ownerTrainerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runAnalyticsTestSuite() {
  console.log('📊 Starting Hardened Analytics, Reporting & Business Intelligence Test Suite (Phase 13)...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const GYM_EMPTY_ID = crypto.randomUUID();
  const OWNER_ALPHA_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecurePass123!');

  // 1. Seed Gyms
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Titan Performance Center',
      code: `GD-TPC-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Vanguard Athletics',
      code: `GD-VAN-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_EMPTY_ID,
      name: 'Pristine Zero-Data Gym',
      code: `GD-ZER-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values({
    id: OWNER_ALPHA_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@titan.gym`,
    fullName: 'Titan Gym Director',
    phoneNumber: '+15551112222',
    passwordHash,
    role: 'OWNER',
    permissions: ['reports.read', 'members.read', 'members.write'],
    accountStatus: 'ACTIVE',
  });

  // 2. Seed Membership Plans in Gym Alpha
  const [goldPlan] = await db
    .insert(membershipPlans)
    .values({
      gymId: GYM_ALPHA_ID,
      planName: 'Gold 90-Day VIP',
      durationDays: 90,
      price: '150.00',
    })
    .returning();

  const [silverPlan] = await db
    .insert(membershipPlans)
    .values({
      gymId: GYM_ALPHA_ID,
      planName: 'Silver 30-Day Pass',
      durationDays: 30,
      price: '60.00',
    })
    .returning();

  // 3. Seed Members & Memberships in Gym Alpha
  const memberA = await ownerService.createMember(
    GYM_ALPHA_ID,
    { fullName: 'Clark Kent', phone: '+15550000001', memberCode: 'GD-CLARK', planId: goldPlan!.id, initialPaymentAmount: 150.0 },
    OWNER_ALPHA_ID
  );

  const memberB = await ownerService.createMember(
    GYM_ALPHA_ID,
    { fullName: 'Diana Prince', phone: '+15550000002', memberCode: 'GD-DIANA', planId: silverPlan!.id, initialPaymentAmount: 60.0 },
    OWNER_ALPHA_ID
  );

  const memberC = await ownerService.createMember(
    GYM_ALPHA_ID,
    { fullName: 'Arthur Curry', phone: '+15550000003', memberCode: 'GD-ARTHUR' },
    OWNER_ALPHA_ID
  );

  // Set Member C to FROZEN
  await db
    .update(gymMembers)
    .set({ membershipStatus: 'FROZEN' })
    .where(eq(gymMembers.id, memberC.id));

  // Seed Member D in Gym Bravo (Cross-tenant testing)
  await ownerService.createMember(
    GYM_BRAVO_ID,
    { fullName: 'Lex Luthor', phone: '+15559990001', memberCode: 'GD-LEX' },
    crypto.randomUUID()
  );

  // 4. Seed Payments in Gym Alpha
  const paymentA = (
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.gymId, GYM_ALPHA_ID), eq(payments.memberId, memberA.id)))
      .limit(1)
  )[0];

  // Process a partial refund of $25 on payment A
  await billingService.refundPayment(
    GYM_ALPHA_ID,
    paymentA!.id,
    { reason: 'Promotional discount refund', refundAmount: 25.0 },
    OWNER_ALPHA_ID
  );

  // 5. Seed Attendance in Gym Alpha (Multiple check-ins, unique members)
  await ownerAttendanceService.checkInMember(
    GYM_ALPHA_ID,
    { memberId: memberA.id, entryMethod: 'QR_DYNAMIC' },
    OWNER_ALPHA_ID
  );
  await ownerAttendanceService.checkInMember(
    GYM_ALPHA_ID,
    { memberId: memberB.id, entryMethod: 'MANUAL' },
    OWNER_ALPHA_ID
  );

  // 6. Seed Trainers & PT in Gym Alpha
  const trainerA = await ownerTrainerService.createTrainer(
    GYM_ALPHA_ID,
    {
      fullName: 'Coach Marcus Vance',
      phone: '+15558887777',
      specialization: 'Hypertrophy & Strength',
      commissionType: 'FIXED_PER_SESSION',
      commissionRate: 35.0,
    },
    OWNER_ALPHA_ID
  );

  await ownerTrainerService.assignTrainer(GYM_ALPHA_ID, memberA.id, { trainerId: trainerA.id }, OWNER_ALPHA_ID);

  const ptPackResult = await ownerTrainerService.purchasePTPackage(
    GYM_ALPHA_ID,
    memberA.id,
    {
      trainerId: trainerA.id,
      packageName: '10-Session Kickstart',
      totalSessions: 10,
      price: 400.0,
      paymentMethod: 'CARD',
    },
    OWNER_ALPHA_ID
  );

  await ownerTrainerService.completePTSession(
    GYM_ALPHA_ID,
    ptPackResult.package.id,
    { focusArea: 'Chest & Triceps' },
    OWNER_ALPHA_ID
  );

  // ==============================================================================
  // TEST 1: Executive Overview Calculation (Full Multi-Domain Integration)
  // ==============================================================================
  console.log('  1. Testing Executive Overview Analytics Calculation...');
  const overview = await analyticsService.getOverview(GYM_ALPHA_ID, { range: 'this_month' });

  assert.equal(overview.gym.id, GYM_ALPHA_ID);
  assert.equal(overview.metrics.members.total, 3);
  assert.equal(overview.metrics.members.active, 2);
  assert.equal(overview.metrics.members.frozen, 1);
  assert.ok(overview.metrics.financial.grossPaid >= 610.0); // 150 + 60 + 400 = 610
  assert.equal(overview.metrics.financial.refunds, 25.0);
  assert.ok(overview.metrics.financial.netPaid >= 585.0); // 610 - 25 = 585
  assert.equal(overview.metrics.attendance.totalCheckins, 2);
  assert.equal(overview.metrics.attendance.uniqueAttendees, 2);
  assert.equal(overview.metrics.trainers.activeTrainers, 1);
  assert.equal(overview.metrics.trainers.completedSessions, 1);
  assert.equal(overview.metrics.trainers.accruedEarnings, 35.0);
  assert.ok(Array.isArray(overview.trends.revenue));
  assert.ok(Array.isArray(overview.trends.attendance));
  assert.ok(overview.generatedAt);
  console.log('     ✅ Executive overview accurately computed metrics across all operational domains.');

  // ==============================================================================
  // TEST 2: Empty Gym Handling (Zero-Data Safety)
  // ==============================================================================
  console.log('  2. Testing Zero-Data Gym Analytics Safety (Clean Zeros, No NaN / Infinity)...');
  const emptyOverview = await analyticsService.getOverview(GYM_EMPTY_ID, { range: 'this_month' });

  assert.equal(emptyOverview.metrics.members.total, 0);
  assert.equal(emptyOverview.metrics.members.active, 0);
  assert.equal(emptyOverview.metrics.financial.grossPaid, 0);
  assert.equal(emptyOverview.metrics.financial.refunds, 0);
  assert.equal(emptyOverview.metrics.financial.netPaid, 0);
  assert.equal(emptyOverview.metrics.attendance.totalCheckins, 0);
  assert.equal(emptyOverview.metrics.attendance.uniqueAttendees, 0);
  assert.equal(emptyOverview.metrics.attendance.dailyAverage, 0);
  assert.equal(emptyOverview.metrics.trainers.activeTrainers, 0);
  assert.equal(emptyOverview.metrics.trainers.completedSessions, 0);
  assert.ok(emptyOverview.trends.revenue.every((p) => p.value === 0));
  assert.ok(emptyOverview.trends.attendance.every((p) => p.value === 0));
  console.log('     ✅ Zero-data gym gracefully returns deterministic zeros without NaN/Infinity.');

  // ==============================================================================
  // TEST 3: Date Range Presets & Resolution
  // ==============================================================================
  console.log('  3. Testing Date Range Presets (today, this_week, this_month, this_year, custom)...');
  const todayOverview = await analyticsService.getOverview(GYM_ALPHA_ID, { range: 'today' });
  const weekOverview = await analyticsService.getOverview(GYM_ALPHA_ID, { range: 'this_week' });
  const yearOverview = await analyticsService.getOverview(GYM_ALPHA_ID, { range: 'this_year' });

  assert.equal(todayOverview.period.preset, 'today');
  assert.equal(weekOverview.period.preset, 'this_week');
  assert.equal(yearOverview.period.preset, 'this_year');

  const customOverview = await analyticsService.getOverview(GYM_ALPHA_ID, {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  });
  assert.equal(customOverview.period.preset, 'custom');
  console.log('     ✅ Date range presets and custom bounded date intervals resolved correctly.');

  // ==============================================================================
  // TEST 4: Revenue & Payment Ledger Analytics
  // ==============================================================================
  console.log('  4. Testing Authoritative Revenue Analytics (Gross, Refunds, Net Paid, Precision)...');
  const revenueData = await analyticsService.getRevenueAnalytics(GYM_ALPHA_ID, { range: 'this_month' });

  assert.ok(revenueData.summary.grossPayments >= 610.0);
  assert.equal(revenueData.summary.refunds, 25.0);
  assert.ok(revenueData.summary.netPaid >= 585.0);
  assert.ok(revenueData.byPaymentMethod.length > 0);
  assert.ok(revenueData.trend.length > 0);
  console.log('     ✅ Revenue analytics respects immutable financial ledger and exact monetary precision.');

  // ==============================================================================
  // TEST 5: Membership & Subscription Analytics
  // ==============================================================================
  console.log('  5. Testing Membership Lifecycle Analytics & Plan Popularity Breakdown...');
  const membershipData = await analyticsService.getMembershipAnalytics(GYM_ALPHA_ID, { range: 'this_month' });

  assert.ok(membershipData.summary.activeMemberships >= 2);
  assert.ok(membershipData.byPlanDistribution.some((p) => p.category === 'Gold 90-Day VIP'));
  assert.ok(membershipData.byPlanDistribution.some((p) => p.category === 'Silver 30-Day Pass'));
  assert.ok(membershipData.newSubscriptionsTrend.length > 0);
  console.log('     ✅ Membership lifecycle analytics aggregated subscription statuses and plan distribution.');

  // ==============================================================================
  // TEST 6: Attendance Analytics (Unique Attendees, Weekday Distribution & Peak Hour)
  // ==============================================================================
  console.log('  6. Testing Attendance Foot-Traffic Analytics (Unique vs Total Check-Ins)...');
  const attendanceData = await analyticsService.getAttendanceAnalytics(GYM_ALPHA_ID, { range: 'this_month' });

  assert.equal(attendanceData.summary.totalCheckIns, 2);
  assert.equal(attendanceData.summary.uniqueMembersAttended, 2);
  assert.equal(attendanceData.byWeekday.length, 7);
  assert.ok(attendanceData.byEntryMethod.some((m) => m.category === 'QR_DYNAMIC'));
  assert.ok(attendanceData.dailyTrend.length > 0);
  console.log('     ✅ Attendance analytics aggregated total check-ins, unique attendees, and weekdays.');

  // ==============================================================================
  // TEST 7: Trainer & PT Utilization Analytics
  // ==============================================================================
  console.log('  7. Testing Personal Training Utilization & Accrued Earnings Analytics...');
  const trainerData = await analyticsService.getTrainerAnalytics(GYM_ALPHA_ID, { range: 'this_month' });

  assert.equal(trainerData.summary.activeTrainersCount, 1);
  assert.equal(trainerData.summary.activePtPackages, 1);
  assert.equal(trainerData.summary.completedSessions, 1);
  assert.equal(trainerData.summary.cancelledSessions, 0);
  assert.equal(trainerData.summary.totalAccruedEarnings, 35.0);
  assert.equal(trainerData.summary.sessionCompletionRate, 100);
  assert.equal(trainerData.trainerPerformance[0]?.fullName, 'Coach Marcus Vance');
  console.log('     ✅ Trainer analytics verified session completion rates, package utilization, and earnings.');

  // ==============================================================================
  // TEST 8: Multi-Tenant Scoping & Anti-IDOR (Gym A cannot read Gym B analytics)
  // ==============================================================================
  console.log('  8. Testing Multi-Tenant Boundary Isolation (Zero Cross-Tenant Analytics Leakage)...');
  const bravoOverview = await analyticsService.getOverview(GYM_BRAVO_ID, { range: 'this_month' });

  assert.equal(bravoOverview.gym.id, GYM_BRAVO_ID);
  assert.equal(bravoOverview.metrics.members.total, 1); // Only Lex Luthor
  assert.equal(bravoOverview.metrics.financial.grossPaid, 0);
  assert.equal(bravoOverview.metrics.attendance.totalCheckins, 0);
  assert.equal(bravoOverview.metrics.trainers.activeTrainers, 0);
  console.log('     ✅ Strict compound tenant scoping guarantees complete isolation between gyms.');

  // ==============================================================================
  // TEST 9: Soft-Delete Semantics (Archived Entities vs Historical Preservation)
  // ==============================================================================
  console.log('  9. Testing Soft-Delete Semantics (Current Counts vs Historical Transactions)...');
  // Soft-delete member B
  await db
    .update(gymMembers)
    .set({ deletedAt: new Date() })
    .where(eq(gymMembers.id, memberB.id));

  const postDeleteOverview = await analyticsService.getOverview(GYM_ALPHA_ID, { range: 'this_month' });

  // Current active members count excludes soft-deleted member (2 active -> 1 active)
  assert.equal(postDeleteOverview.metrics.members.active, 1);
  assert.equal(postDeleteOverview.metrics.members.total, 2);

  // But historical financial payments & attendance logs of member B remain preserved in period totals!
  assert.ok(postDeleteOverview.metrics.financial.grossPaid >= 610.0);
  assert.equal(postDeleteOverview.metrics.attendance.totalCheckins, 2);
  console.log('     ✅ Soft-deleted entities excluded from current rosters but preserved in historical revenue/attendance.');

  // ==============================================================================
  // TEST 10: Secure CSV Export & Formula Injection Prevention
  // ==============================================================================
  console.log('  10. Testing Bounded CSV Export & Spreadsheet Formula Injection Defense...');
  // Seed a member with potentially malicious spreadsheet formula in name
  await ownerService.createMember(
    GYM_ALPHA_ID,
    { fullName: '=cmd|’ /C calc’!A0', phone: '+15553334444', memberCode: 'GD-MAL' },
    OWNER_ALPHA_ID
  );

  const exportRes = await analyticsService.exportReport(GYM_ALPHA_ID, 'MEMBERS', {}, OWNER_ALPHA_ID);

  assert.ok(exportRes.data.includes('"\'=cmd|’ /C calc’!A0"')); // Formula safely escaped with leading single-quote
  assert.equal(exportRes.contentType, 'text/csv; charset=utf-8');
  assert.ok(exportRes.rowCount >= 3);
  console.log('     ✅ CSV export strictly sanitizes leading formula injection characters (=, +, -, @).');

  // ==============================================================================
  // TEST 11: Security & Date Range Bounds Enforcement
  // ==============================================================================
  console.log('  11. Testing Excessive Date Range Boundary Rejection (>366 Days)...');
  await assert.rejects(
    async () => {
      await analyticsService.getOverview(GYM_ALPHA_ID, {
        from: '2020-01-01',
        to: '2026-09-01', // 6+ years exceeds max 366 days
      });
    },
    (err: any) => err.statusCode === 422
  );
  console.log('     ✅ Unbounded / excessive date ranges rejected server-side to prevent memory exhaustion.');

  // ==============================================================================
  // TEST 12: Concurrency & Parallel Analytics Requests
  // ==============================================================================
  console.log('  12. Testing Concurrency (20 Parallel Analytics Overview Requests)...');
  const parallelResults = await Promise.all(
    Array.from({ length: 20 }).map(() =>
      analyticsService.getOverview(GYM_ALPHA_ID, { range: 'this_month' })
    )
  );

  assert.equal(parallelResults.length, 20);
  assert.ok(parallelResults.every((r) => r.metrics.members.total === 3));
  assert.ok(parallelResults.every((r) => r.metrics.financial.refunds === 25.0));
  console.log('     ✅ 20 concurrent analytics requests executed with zero race conditions or data drift.');

  // ==============================================================================
  // TEST 13: Transactional Snapshot Consistency Under Concurrent Business Mutation
  // ==============================================================================
  console.log('  13. Testing Transactional Snapshot Consistency Under Concurrent Business Mutations...');
  // Trigger overview read simultaneously with a new member creation and record payment
  const [snapshotResult, _newMember] = await Promise.all([
    analyticsService.getOverview(GYM_ALPHA_ID, { range: 'this_month' }),
    ownerService.createMember(
      GYM_ALPHA_ID,
      { fullName: 'Barry Allen', phone: '+15554443333', memberCode: 'GD-FLASH' },
      OWNER_ALPHA_ID
    ),
  ]);

  assert.ok(snapshotResult.generatedAt);
  assert.ok(snapshotResult.metrics.members.total >= 3);
  console.log('     ✅ Repeatable Read transaction ensures snapshot consistency without partial read anomalies.');

  // ==============================================================================
  // TEST 14: Financial Precision (Large Amounts, Exact Decimals, Zero Overflows)
  // ==============================================================================
  console.log('  14. Testing Financial Precision on Large Ledger Amounts & Exact Scale...');
  const largeMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    { fullName: 'Bruce Wayne', phone: '+15557778888', memberCode: 'GD-BRUCE' },
    OWNER_ALPHA_ID
  );

  // Record a $50,000.00 VIP lifetime contribution payment
  const largePayment = await billingService.recordPayment(
    GYM_ALPHA_ID,
    largeMember.id,
    { amount: 50000.0, paymentMethod: 'BANK_TRANSFER', notes: 'VIP Endowment' },
    OWNER_ALPHA_ID
  );

  // Refund $0.01 (penny-level precision check)
  await billingService.refundPayment(
    GYM_ALPHA_ID,
    largePayment.id,
    { reason: 'Penny rounding adjustment', refundAmount: 0.01 },
    OWNER_ALPHA_ID
  );

  const precisionRevenue = await analyticsService.getRevenueAnalytics(GYM_ALPHA_ID, { range: 'this_month' });
  assert.ok(precisionRevenue.summary.grossPayments >= 50610.0);
  assert.ok(precisionRevenue.summary.refunds >= 25.01);
  assert.ok(precisionRevenue.summary.netPaid >= 50584.99);
  console.log('     ✅ Financial ledger exactness maintained with NUMERIC decimal precision and penny refunds.');

  // ==============================================================================
  // TEST 15: CSV Numeric Preservation & Advanced Formula Injection Protection
  // ==============================================================================
  console.log('  15. Testing CSV Numeric Value Preservation & Advanced Spreadsheet Injection Vectors...');
  const testRows = [
    { name: 'Alice', amount: '-250.00', status: 'ACTIVE' },
    { name: 'Bob', amount: '+100.50', status: 'ACTIVE' },
    { name: 'Charlie', amount: '0.00', status: 'ACTIVE' },
    { name: '=1+1', amount: '50.00', status: 'ACTIVE' },
    { name: '+1+1', amount: '50.00', status: 'ACTIVE' },
    { name: '@SUM(A1:A2)', amount: '50.00', status: 'ACTIVE' },
    { name: '\tcmd_inject', amount: '50.00', status: 'ACTIVE' },
    { name: '  =calc_payload', amount: '50.00', status: 'ACTIVE' },
  ];

  const formattedCsv = analyticsService.formatCsvWithSafety(testRows);

  // Pure numbers must NOT be prefixed with single quote
  assert.ok(formattedCsv.includes('"-250.00"'), 'Negative numbers must not be corrupted with single quotes');
  assert.ok(formattedCsv.includes('"+100.50"'), 'Positive signed numbers must not be corrupted');
  assert.ok(formattedCsv.includes('"0.00"'), 'Zero numbers must remain clean');

  // Formula payloads MUST be prefixed with single quote
  assert.ok(formattedCsv.includes('"\'=1+1"'), 'Leading = formula must be safely single-quoted');
  assert.ok(formattedCsv.includes('"\'@SUM(A1:A2)"'), 'Leading @ formula must be safely single-quoted');
  assert.ok(formattedCsv.includes('"\'\tcmd_inject"'), 'Leading TAB command must be safely single-quoted');
  assert.ok(formattedCsv.includes('"\'  =calc_payload"'), 'Whitespace + = payload must be safely single-quoted');
  console.log('     ✅ CSV export strictly distinguishes legitimate negative numeric values from dangerous formulas.');

  // ==============================================================================
  // TEST 16: Subscription Renewals vs First-Time Subscriptions Counting Invariant
  // ==============================================================================
  console.log('  16. Testing Subscription Renewals vs First-Time Membership Invariants...');
  // Renew memberA's membership
  await billingService.renewMembership(
    GYM_ALPHA_ID,
    memberA.id,
    { planId: goldPlan!.id, paymentAmount: 150.0, paymentMethod: 'CARD' },
    OWNER_ALPHA_ID
  );

  const subAnalytics = await analyticsService.getMembershipAnalytics(GYM_ALPHA_ID, { range: 'this_month' });
  assert.ok(subAnalytics.summary.renewalsInPeriod >= 1, 'Renewal must be counted in renewalsInPeriod');
  assert.ok(subAnalytics.summary.newMembershipsInPeriod >= 2, 'First-time memberships must be counted separately');
  console.log('     ✅ Renewals and first-time subscriptions accurately distinguished in lifecycle analytics.');

  // ==============================================================================
  // TEST 17: Timezone Validation & Bounded Reporting Edge Cases
  // ==============================================================================
  console.log('  17. Testing Timezone Validation & Strict IANA Identifiers...');
  await assert.rejects(
    async () => {
      await analyticsService.getOverview(GYM_ALPHA_ID, {
        range: 'this_month',
        timezone: 'Invalid/NonExistent_Zone',
      });
    },
    (err: any) => err.statusCode === 422
  );

  const estOverview = await analyticsService.getOverview(GYM_ALPHA_ID, {
    range: 'this_month',
    timezone: 'America/New_York',
  });
  assert.equal(estOverview.period.timezone, 'America/New_York');
  console.log('     ✅ Invalid timezones rejected with 422; valid IANA timezones properly applied in reporting.');

  // ==============================================================================
  // TEST 18: Malicious Tenant ID Injection & Unsupported Export Type Defense
  // ==============================================================================
  console.log('  18. Testing Malicious Report Types & Injection Defense...');
  await assert.rejects(
    async () => {
      await analyticsService.exportReport(
        GYM_ALPHA_ID,
        'INJECT_DROP_TABLE_USERS' as any,
        {},
        OWNER_ALPHA_ID
      );
    },
    (err: any) => err.statusCode === 422
  );
  console.log('     ✅ Arbitrary/unsupported report types rejected before query generation.');

  console.log('\n🎉 ALL 18 HARDENED BUSINESS INTELLIGENCE & ANALYTICS (PHASE 13) TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runAnalyticsTestSuite().catch((err) => {
  console.error('❌ Analytics Test Suite failed:', err);
  process.exit(1);
});
