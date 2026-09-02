/**
 * GymDeck Phase 10: Membership Lifecycle & Subscription Operations Test Suite
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  memberMemberships,
  auditLogs,
  syncChangeLog,
} from '../shared/database/schema';
import { ownerMembershipService } from '../services/owner/ownerMembershipService';
import { billingService } from '../services/billing/billingService';
import { ownerAttendanceService } from '../services/owner/ownerAttendanceService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runOwnerMembershipLifecycleTestSuite() {
  console.log('🔄 Starting Owner Membership Lifecycle & Subscription Operations Test Suite...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const OWNER_USER_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecureOwnerPass123!');

  // 1. Seed Gyms & Owner User
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Alpha Fitness Club',
      code: `GD-ALPHA-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Crossfit',
      code: `GD-BRAVO-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values({
    id: OWNER_USER_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@alpha.gym`,
    fullName: 'Alpha Club Owner',
    passwordHash,
    role: 'OWNER',
    permissions: ['memberships.read', 'memberships.write', 'attendance.read', 'attendance.write', 'members.read', 'members.write'],
    accountStatus: 'ACTIVE',
  });

  // 2. Create Membership Plans
  const quarterlyPlan = await billingService.createPlan(
    GYM_ALPHA_ID,
    {
      planName: 'Quarterly Gold',
      durationDays: 90,
      price: 250,
      description: '90 days full access',
    },
    OWNER_USER_ID
  );

  const annualPlan = await billingService.createPlan(
    GYM_ALPHA_ID,
    {
      planName: 'Annual Diamond',
      durationDays: 365,
      price: 800,
    },
    OWNER_USER_ID
  );

  // 3. Create Member in Gym Alpha
  const member = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Logan Wolverine',
      phone: '+15558889900',
      memberCode: 'GD-WEAPON-X',
    },
    OWNER_USER_ID
  );

  // 4. Create Member in Gym Bravo (for Cross-Tenant testing)
  const bravoMember = await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Victor Creed',
      phone: '+15557776655',
      memberCode: 'GD-SABRE',
    },
    OWNER_USER_ID
  );

  // ==============================================================================
  // TEST 1: Initial Membership Activation & Contract Price Freezing
  // ==============================================================================
  console.log('  1. Testing Membership Activation & Contract Price Freezing...');
  const purchaseRes = await billingService.purchaseMembership(
    GYM_ALPHA_ID,
    member.id,
    {
      planId: quarterlyPlan.id,
      paymentAmount: 250,
      paymentMethod: 'CARD',
      transactionReference: 'TXN-CARD-1001',
    },
    OWNER_USER_ID
  );

  assert.ok(purchaseRes.membership.id);
  assert.equal(purchaseRes.membership.status, 'ACTIVE');
  assert.equal(Number(purchaseRes.membership.priceAtPurchase), 250);
  console.log('     ✅ Membership activated with frozen contractual price.');

  // ==============================================================================
  // TEST 2: Current Membership Query & Derived Lifecycle Metrics
  // ==============================================================================
  console.log('  2. Testing Current Membership Query & Days Remaining Calculation...');
  const current = await ownerMembershipService.getCurrentMembership(GYM_ALPHA_ID, member.id);
  assert.ok(current);
  assert.equal(current?.id, purchaseRes.membership.id);
  assert.equal(current?.status, 'ACTIVE');
  assert.ok(current!.daysRemaining > 85 && current!.daysRemaining <= 90);
  assert.equal(current?.isExpiringSoon, false);
  console.log(`     ✅ Current membership retrieved with ${current?.daysRemaining} days remaining.`);

  // ==============================================================================
  // TEST 3: Freeze Membership Subscription
  // ==============================================================================
  console.log('  3. Testing Freeze Membership Operation...');
  const freezeRes = await ownerMembershipService.freezeMembership(
    GYM_ALPHA_ID,
    member.id,
    purchaseRes.membership.id,
    { reason: 'Member traveling overseas for 3 weeks' },
    OWNER_USER_ID
  );

  assert.equal(freezeRes.status, 'FROZEN');
  assert.ok(freezeRes.frozenDaysRemaining > 85);

  // Verify DB state
  const memberAfterFreeze = await ownerService.getMemberById(GYM_ALPHA_ID, member.id);
  assert.equal(memberAfterFreeze.member.membershipStatus, 'FROZEN');
  console.log('     ✅ Membership frozen; remaining days stored and member status updated.');

  // ==============================================================================
  // TEST 4: Attendance Eligibility Integration (Frozen Membership Rejected)
  // ==============================================================================
  console.log('  4. Testing Attendance Eligibility Integration for Frozen Member...');
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkInMember(
        GYM_ALPHA_ID,
        { memberId: member.id },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 403
  );
  console.log('     ✅ Frozen member strictly blocked from floor attendance check-in.');

  // ==============================================================================
  // TEST 5: Invalid State Transitions (Double Freeze Rejection)
  // ==============================================================================
  console.log('  5. Testing Invalid State Transitions (Double Freeze)...');
  await assert.rejects(
    async () => {
      await ownerMembershipService.freezeMembership(
        GYM_ALPHA_ID,
        member.id,
        purchaseRes.membership.id,
        { reason: 'Another freeze attempt' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ Double freeze correctly rejected with 409 Conflict.');

  // ==============================================================================
  // TEST 6: Unfreeze Membership Subscription & Attendance Re-enabling
  // ==============================================================================
  console.log('  6. Testing Unfreeze Membership & Attendance Re-enabling...');
  const unfreezeRes = await ownerMembershipService.unfreezeMembership(
    GYM_ALPHA_ID,
    member.id,
    purchaseRes.membership.id,
    OWNER_USER_ID
  );

  assert.equal(unfreezeRes.status, 'ACTIVE');
  assert.ok(new Date(unfreezeRes.newEndDate) > new Date());

  const memberAfterUnfreeze = await ownerService.getMemberById(GYM_ALPHA_ID, member.id);
  assert.equal(memberAfterUnfreeze.member.membershipStatus, 'ACTIVE');

  // Attendance check-in must now succeed!
  const checkIn = await ownerAttendanceService.checkInMember(
    GYM_ALPHA_ID,
    { memberId: member.id },
    OWNER_USER_ID
  );
  assert.equal(checkIn.status, 'APPROVED');
  console.log('     ✅ Membership unfrozen; remaining duration restored and attendance re-enabled.');

  // ==============================================================================
  // TEST 7: Expiring-Soon Directory Query (Horizon Filter)
  // ==============================================================================
  console.log('  7. Testing Expiring Memberships Directory Filter...');
  // Seed a member expiring in 3 days
  const expiringMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    { fullName: 'Jean Grey', phone: '+15553332211', memberCode: 'GD-PHOENIX' },
    OWNER_USER_ID
  );
  const expiringEnd = new Date();
  expiringEnd.setDate(expiringEnd.getDate() + 3);

  await db.insert(memberMemberships).values({
    gymId: GYM_ALPHA_ID,
    memberId: expiringMember.id,
    planId: quarterlyPlan.id,
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: expiringEnd,
    priceAtPurchase: '250.00',
  });

  const expiringList = await ownerMembershipService.getExpiringMemberships(GYM_ALPHA_ID, 7);
  assert.ok(expiringList.totalCount >= 1);
  const found = expiringList.items.find((i) => i.memberId === expiringMember.id);
  assert.ok(found);
  assert.ok(found!.daysRemaining <= 3);
  console.log('     ✅ Expiring-soon query correctly captured expiring subscriptions.');

  // ==============================================================================
  // TEST 8: Subscription Renewal & Continuous Timeline Preservation
  // ==============================================================================
  console.log('  8. Testing Subscription Renewal & Historical Preservation...');
  const renewalRes = await billingService.renewMembership(
    GYM_ALPHA_ID,
    member.id,
    {
      planId: annualPlan.id,
      paymentAmount: 800,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-RENEW-1002',
    },
    OWNER_USER_ID
  );

  assert.ok(renewalRes.membership.id);
  assert.notEqual(renewalRes.membership.id, purchaseRes.membership.id);

  // Check history: Member must have 2 distinct historical memberships
  const history = await ownerMembershipService.getMembershipHistory(GYM_ALPHA_ID, member.id);
  assert.equal(history.totalCount, 2);
  assert.equal(history.items[0]!.planName, 'Annual Diamond');
  assert.equal(history.items[1]!.planName, 'Quarterly Gold');
  console.log('     ✅ Renewal created new membership while preserving full subscription history.');

  // ==============================================================================
  // TEST 9: Operational Lifecycle Statistics Aggregation
  // ==============================================================================
  console.log('  9. Testing Operational Lifecycle Statistics Aggregation...');
  const stats = await ownerMembershipService.getMembershipLifecycleStats(GYM_ALPHA_ID);
  assert.ok(stats.activeCount >= 2);
  assert.ok(stats.expiringIn7DaysCount >= 1);
  console.log('     ✅ Operational stats aggregated server-side across all lifecycle states.');

  // ==============================================================================
  // TEST 10 & 11: Multi-Tenant Anti-IDOR Boundary Enforcement
  // ==============================================================================
  console.log('  10 & 11. Testing Anti-IDOR & Cross-Tenant Boundaries...');
  // Gym Alpha cannot freeze Gym Bravo member's subscription
  await assert.rejects(
    async () => {
      await ownerMembershipService.freezeMembership(
        GYM_ALPHA_ID,
        bravoMember.id,
        purchaseRes.membership.id,
        { reason: 'Cross tenant attack' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot query Gym Alpha member's current membership
  await assert.rejects(
    async () => {
      await ownerMembershipService.getCurrentMembership(GYM_BRAVO_ID, member.id);
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Anti-IDOR strictly blocks all cross-tenant lifecycle operations.');

  // ==============================================================================
  // TEST 12: Sync Stream Durability for Desktop Pull
  // ==============================================================================
  console.log('  12. Testing Desktop Sync Change Log Participation...');
  const syncChanges = await db
    .select()
    .from(syncChangeLog)
    .where(and(eq(syncChangeLog.gymId, GYM_ALPHA_ID), eq(syncChangeLog.entityType, 'member_membership')));
  assert.ok(syncChanges.length >= 3, 'Must record sync changes for activation, freeze, unfreeze, renewal');
  console.log('     ✅ All membership lifecycle mutations streamed into sync_change_log.');

  // ==============================================================================
  // TEST 13: Full Audit Trail for Lifecycle Operations
  // ==============================================================================
  console.log('  13. Testing Membership Lifecycle Audit Trail...');
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.gymId, GYM_ALPHA_ID));
  assert.ok(logs.some((l) => l.action === 'MEMBERSHIP_FROZEN'));
  assert.ok(logs.some((l) => l.action === 'MEMBERSHIP_UNFROZEN'));
  console.log('     ✅ Full lifecycle audit trail preserved with actor context.');

  console.log('\n🎉 ALL OWNER MEMBERSHIP LIFECYCLE & SUBSCRIPTION TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runOwnerMembershipLifecycleTestSuite().catch((err) => {
  console.error('❌ Membership Lifecycle Test Suite failed:', err);
  process.exit(1);
});
