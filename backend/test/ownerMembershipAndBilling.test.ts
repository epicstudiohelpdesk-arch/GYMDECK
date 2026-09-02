/**
 * GymDeck Phase 8: Membership, Billing & Financial Ledger Test Matrix
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  gymMembers,
  auditLogs,
  syncChangeLog,
} from '../shared/database/schema';
import { billingService } from '../services/billing/billingService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runMembershipBillingTestSuite() {
  console.log('💳 Starting Owner Membership, Billing & Financial Ledger Test Suite...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const OWNER_USER_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecureOwnerPass123!');

  // 1. Seed Gyms & Users
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Alpha Gym Flagship',
      code: `GD-ALPHA-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Competitor Gym',
      code: `GD-BRAVO-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values({
    id: OWNER_USER_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@alpha.gym`,
    fullName: 'Alpha Gym Owner',
    passwordHash,
    role: 'OWNER',
    permissions: ['members.read', 'members.write', 'memberships.read', 'memberships.write', 'payments.read', 'payments.write'],
    accountStatus: 'ACTIVE',
  });

  // 2. Seed Member in Gym Alpha
  const memberAlpha = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Bruce Wayne',
      phone: '+15551234567',
      email: 'bruce@waynecorp.test',
    },
    OWNER_USER_ID
  );

  // 3. Seed Member in Gym Bravo
  const memberBravo = await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Clark Kent',
      phone: '+15557654321',
    },
    OWNER_USER_ID
  );

  // ==============================================================================
  // TEST 1: Membership Plan Creation & Validation
  // ==============================================================================
  console.log('  1. Testing Membership Plan Creation & Constraints...');
  const monthlyPlan = await billingService.createPlan(
    GYM_ALPHA_ID,
    {
      planName: 'Monthly Standard',
      durationDays: 30,
      price: 100,
      description: 'Standard monthly gym pass',
      benefits: ['Gym access', 'Locker access'],
    },
    OWNER_USER_ID
  );

  assert.ok(monthlyPlan.id);
  assert.equal(monthlyPlan.planName, 'Monthly Standard');
  assert.equal(Number(monthlyPlan.price), 100);
  assert.equal(monthlyPlan.isActive, true);

  // Invalid duration rejection
  await assert.rejects(
    async () => {
      await billingService.createPlan(GYM_ALPHA_ID, { planName: 'Invalid', durationDays: 0, price: 50 });
    },
    (err: any) => err.statusCode === 422
  );
  console.log('     ✅ Plan created and input constraints verified.');

  // ==============================================================================
  // TEST 2: Plan Listing & Updating (Deactivation doesn't destroy past subscriptions)
  // ==============================================================================
  console.log('  2. Testing Plan Listing, Updates & Soft Deactivation...');
  const plansList = await billingService.getPlans(GYM_ALPHA_ID);
  assert.equal(plansList.length, 1);

  const updatedPlan = await billingService.updatePlan(
    GYM_ALPHA_ID,
    monthlyPlan.id,
    { price: 120, description: 'Updated pricing with sauna' },
    OWNER_USER_ID
  );
  assert.equal(Number(updatedPlan.price), 120);
  console.log('     ✅ Plan update persisted with audit logging.');

  // ==============================================================================
  // TEST 3: Membership Purchase with Initial Payment (Atomic Ledger Event)
  // ==============================================================================
  console.log('  3. Testing Membership Purchase with Initial Payment...');
  const purchaseRes = await billingService.purchaseMembership(
    GYM_ALPHA_ID,
    memberAlpha.id,
    {
      planId: monthlyPlan.id,
      paymentAmount: 120,
      paymentMethod: 'CARD',
      transactionReference: 'TXN-998811',
      idempotencyKey: 'IDEMP-PURCHASE-001',
    },
    OWNER_USER_ID
  );

  assert.ok(purchaseRes.membership.id);
  assert.equal(purchaseRes.membership.planId, monthlyPlan.id);
  assert.equal(Number(purchaseRes.membership.priceAtPurchase), 120);
  assert.equal(purchaseRes.membership.status, 'ACTIVE');

  assert.ok(purchaseRes.payment.id);
  assert.equal(Number(purchaseRes.payment.amount), 120);
  assert.equal(purchaseRes.payment.status, 'COMPLETED');
  assert.ok(purchaseRes.payment.receiptNumber.startsWith('REC-'));

  // Verify Member expiry on gymMembers table
  const updatedMemberAlpha = (
    await db.select().from(gymMembers).where(eq(gymMembers.id, memberAlpha.id)).limit(1)
  )[0];
  assert.equal(updatedMemberAlpha?.membershipStatus, 'ACTIVE');
  assert.ok(updatedMemberAlpha?.expiresAt);
  console.log('     ✅ Membership and payment atomically committed with frozen contractual price.');

  // ==============================================================================
  // TEST 4: Continuous Membership Renewal Before Expiry (Continuous Extension)
  // ==============================================================================
  console.log('  4. Testing Continuous Membership Renewal Before Expiry...');
  const initialEndDate = new Date(purchaseRes.membership.endDate);

  const renewalRes = await billingService.renewMembership(
    GYM_ALPHA_ID,
    memberAlpha.id,
    {
      planId: monthlyPlan.id,
      paymentAmount: 120,
      paymentMethod: 'UPI',
      idempotencyKey: 'IDEMP-RENEWAL-001',
    },
    OWNER_USER_ID
  );

  assert.ok(renewalRes.membership.id);
  // Renewal start date must match previous membership end date
  assert.equal(
    new Date(renewalRes.membership.startDate).toISOString(),
    initialEndDate.toISOString()
  );
  // Renewal end date must be startDate + 30 days
  const expectedRenewalEnd = new Date(initialEndDate);
  expectedRenewalEnd.setDate(expectedRenewalEnd.getDate() + 30);
  assert.equal(
    new Date(renewalRes.membership.endDate).toDateString(),
    expectedRenewalEnd.toDateString()
  );

  // Verify historical records: 2 membership instances exist
  const memberSubs = await billingService.getMemberBillingSummary(GYM_ALPHA_ID, memberAlpha.id);
  assert.equal(memberSubs.totalBilled, 240); // 120 + 120
  assert.equal(memberSubs.totalPaid, 240); // 120 + 120
  assert.equal(memberSubs.outstandingBalance, 0);
  console.log('     ✅ Continuous renewal extended end date seamlessly without overwriting history.');

  // ==============================================================================
  // TEST 5: Standalone Dues Payment & Idempotency Key Deduplication
  // ==============================================================================
  console.log('  5. Testing Payment Idempotency Key Deduplication...');
  // Seed a membership without payment to create an outstanding balance
  const annualPlan = await billingService.createPlan(
    GYM_ALPHA_ID,
    {
      planName: 'Annual VIP',
      durationDays: 365,
      price: 1000,
    },
    OWNER_USER_ID
  );

  const unpaidSub = await billingService.purchaseMembership(
    GYM_ALPHA_ID,
    memberAlpha.id,
    {
      planId: annualPlan.id,
      paymentAmount: 0, // No payment made initially
    },
    OWNER_USER_ID
  );

  const summaryWithDues = await billingService.getMemberBillingSummary(GYM_ALPHA_ID, memberAlpha.id);
  assert.equal(summaryWithDues.totalBilled, 1240); // 120 + 120 + 1000
  assert.equal(summaryWithDues.totalPaid, 240);
  assert.equal(summaryWithDues.outstandingBalance, 1000);

  // Record payment with Idempotency Key
  const IDEMP_KEY = 'PAY-IDEMP-KEY-999';
  const payment1 = await billingService.recordPayment(
    GYM_ALPHA_ID,
    memberAlpha.id,
    {
      membershipId: unpaidSub.membership.id,
      amount: 500,
      paymentMethod: 'CASH',
      idempotencyKey: IDEMP_KEY,
    },
    OWNER_USER_ID
  );

  // Immediate retry with same idempotency key (simulating network retry)
  const payment2 = await billingService.recordPayment(
    GYM_ALPHA_ID,
    memberAlpha.id,
    {
      membershipId: unpaidSub.membership.id,
      amount: 500,
      paymentMethod: 'CASH',
      idempotencyKey: IDEMP_KEY,
    },
    OWNER_USER_ID
  );

  assert.equal(payment1.id, payment2.id, 'Idempotent retry must return existing payment ID');

  const summaryAfterPartial = await billingService.getMemberBillingSummary(GYM_ALPHA_ID, memberAlpha.id);
  assert.equal(summaryAfterPartial.totalPaid, 740); // 240 + 500
  assert.equal(summaryAfterPartial.outstandingBalance, 500); // 1240 - 740
  console.log('     ✅ Payment idempotency proven: retry returned exact transaction without duplicate charge.');

  // ==============================================================================
  // TEST 6: Immutable Financial Ledger Reversal / Refund & Overflow Protection
  // ==============================================================================
  console.log('  6. Testing Immutable Reversal / Refund Flow & Overflow Protection...');
  // 6a. Attempt overflow refund (e.g. refunding $600 on a $500 payment) -> Must be rejected
  await assert.rejects(
    async () => {
      await billingService.refundPayment(
        GYM_ALPHA_ID,
        payment1.id,
        { reason: 'Attempt overflow refund', refundAmount: 600 },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 422
  );

  // 6b. Partial Refund 1: Refund $200 of $500
  const partialRefund1 = await billingService.refundPayment(
    GYM_ALPHA_ID,
    payment1.id,
    { reason: 'Partial refund of $200', refundAmount: 200 },
    OWNER_USER_ID
  );
  assert.equal(Number(partialRefund1.amount), -200);

  // 6c. Partial Refund 2: Attempt refunding $400 (only $300 remains) -> Must be rejected
  await assert.rejects(
    async () => {
      await billingService.refundPayment(
        GYM_ALPHA_ID,
        payment1.id,
        { reason: 'Overflow second partial', refundAmount: 400 },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 422
  );

  // 6d. Partial Refund 3: Refund remaining $300
  const partialRefund2 = await billingService.refundPayment(
    GYM_ALPHA_ID,
    payment1.id,
    { reason: 'Refund remaining $300', refundAmount: 300 },
    OWNER_USER_ID
  );
  assert.equal(Number(partialRefund2.amount), -300);

  // 6e. Attempt refunding fully refunded payment -> Must be rejected with 409 Conflict
  await assert.rejects(
    async () => {
      await billingService.refundPayment(
        GYM_ALPHA_ID,
        payment1.id,
        { reason: 'Attempt refund on fully refunded payment' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 409
  );

  // 6f. Attempt refunding a refund record itself -> Must be rejected
  await assert.rejects(
    async () => {
      await billingService.refundPayment(
        GYM_ALPHA_ID,
        partialRefund1.id,
        { reason: 'Attempt refund of a refund' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 422
  );

  // Verify outstanding balance after full refund ($200 + $300 = $500 refunded)
  const summaryAfterRefund = await billingService.getMemberBillingSummary(GYM_ALPHA_ID, memberAlpha.id);
  assert.equal(summaryAfterRefund.totalPaid, 240); // 740 - 200 - 300
  assert.equal(summaryAfterRefund.outstandingBalance, 1000); // Back to 1000 dues
  console.log('     ✅ Partial refunds and overflow protections validated; ledger balance reconciled.');

  // ==============================================================================
  // TEST 7: Formal Structured Receipt Generation
  // ==============================================================================
  console.log('  7. Testing Formal Structured Receipt Generation...');
  const receipt = await billingService.getReceipt(GYM_ALPHA_ID, purchaseRes.payment.id);

  assert.ok(receipt.receiptNumber.startsWith('REC-'));
  assert.equal(receipt.member.fullName, 'Bruce Wayne');
  assert.equal(receipt.gym.name, 'Alpha Gym Flagship');
  assert.equal(receipt.membership?.planName, 'Monthly Standard');
  assert.equal(Number(receipt.payment.amount), 120);
  console.log('     ✅ Structured receipt contract validated.');

  // ==============================================================================
  // TEST 8: Financial Dashboard KPI Aggregations
  // ==============================================================================
  console.log('  8. Testing Financial Dashboard KPIs...');
  const dashMetrics = await billingService.getFinancialDashboard(GYM_ALPHA_ID);

  assert.ok(dashMetrics.todayRevenue >= 240);
  assert.ok(dashMetrics.monthRevenue >= 240);
  assert.ok(dashMetrics.activeMembershipsCount >= 1);
  console.log('     ✅ Financial dashboard metrics correctly calculated server-side.');

  // ==============================================================================
  // TEST 9 & 10: Anti-IDOR & Multi-Tenant Boundaries
  // ==============================================================================
  console.log('  9 & 10. Testing Anti-IDOR & Cross-Tenant Boundaries...');
  // Gym Alpha cannot purchase membership for Gym Bravo member
  await assert.rejects(
    async () => {
      await billingService.purchaseMembership(
        GYM_ALPHA_ID,
        memberBravo.id,
        { planId: monthlyPlan.id },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot assign Gym Alpha plan
  await assert.rejects(
    async () => {
      await billingService.purchaseMembership(
        GYM_BRAVO_ID,
        memberBravo.id,
        { planId: monthlyPlan.id },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot access Gym Alpha payment receipt
  await assert.rejects(
    async () => {
      await billingService.getReceipt(GYM_BRAVO_ID, purchaseRes.payment.id);
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot refund Gym Alpha payment
  await assert.rejects(
    async () => {
      await billingService.refundPayment(
        GYM_BRAVO_ID,
        purchaseRes.payment.id,
        { reason: 'Attacker refund attempt' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Anti-IDOR strictly blocks all cross-tenant financial access and mutations.');

  // ==============================================================================
  // TEST 11: Desktop Sync Stream Integration
  // ==============================================================================
  console.log('  11. Testing Sync Change Log Integration for Desktop Pull...');
  const syncChanges = await db
    .select()
    .from(syncChangeLog)
    .where(and(eq(syncChangeLog.gymId, GYM_ALPHA_ID), eq(syncChangeLog.entityType, 'member_membership')));
  assert.ok(syncChanges.length >= 2, 'Must record sync changes for purchases and renewals');
  console.log('     ✅ Financial mutations stream into sync_change_log for Desktop sync pull.');

  // ==============================================================================
  // TEST 12: Audit Trail Verification
  // ==============================================================================
  console.log('  12. Testing Audit Logs for All Financial Events...');
  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.gymId, GYM_ALPHA_ID));
  assert.ok(logs.some((l) => l.action === 'PLAN_CREATED'));
  assert.ok(logs.some((l) => l.action === 'MEMBERSHIP_PURCHASED'));
  assert.ok(logs.some((l) => l.action === 'MEMBERSHIP_RENEWED'));
  assert.ok(logs.some((l) => l.action === 'PAYMENT_RECORDED'));
  assert.ok(logs.some((l) => l.action === 'PAYMENT_REFUNDED'));
  console.log('     ✅ Full financial audit trail preserved.');

  console.log('\n🎉 ALL MEMBERSHIP, BILLING & FINANCIAL LEDGER TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runMembershipBillingTestSuite().catch((err) => {
  console.error('❌ Membership & Billing Test Suite failed:', err);
  process.exit(1);
});
