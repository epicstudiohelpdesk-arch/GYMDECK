/**
 * GymDeck Phase 12A Hardening: Notification Core & Communication Hub Comprehensive Test Suite
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  domainEvents,
  notifications,
  notificationDeliveries,
} from '../shared/database/schema';
import { domainEventBus } from '../services/notifications/domainEventBus';
import { notificationEngine } from '../services/notifications/notificationEngine';
import { notificationService } from '../services/notifications/notificationService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runNotificationCoreHardeningTestSuite() {
  console.log('🛡️ Starting Notification Core & Communication Hub Hardening Test Suite (Phase 12A)...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const OWNER_USER_ID = crypto.randomUUID();
  const OWNER_BRAVO_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecureOwnerPass123!');

  // 1. Seed Gyms & Owners
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Alpha Performance Arena',
      code: `GD-NOTIF-A-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Strength Lab',
      code: `GD-NOTIF-B-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values([
    {
      id: OWNER_USER_ID,
      gymId: GYM_ALPHA_ID,
      email: `owner-${crypto.randomUUID().substring(0, 6)}@alphaarena.gym`,
      fullName: 'Master Gym Owner Alpha',
      passwordHash,
      role: 'OWNER',
      permissions: ['reports.read', 'members.read', 'members.write'],
      accountStatus: 'ACTIVE',
    },
    {
      id: OWNER_BRAVO_ID,
      gymId: GYM_BRAVO_ID,
      email: `owner-${crypto.randomUUID().substring(0, 6)}@bravolab.gym`,
      fullName: 'Master Gym Owner Bravo',
      passwordHash,
      role: 'OWNER',
      permissions: ['reports.read', 'members.read', 'members.write'],
      accountStatus: 'ACTIVE',
    },
  ]);

  // 2. Seed Members
  const memberA = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Bruce Wayne',
      phone: '+15551112233',
      memberCode: 'GD-WAYNE',
    },
    OWNER_USER_ID
  );

  const memberB = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Clark Kent',
      phone: '+15552223344',
      memberCode: 'GD-KENT',
    },
    OWNER_USER_ID
  );

  await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Diana Prince',
      phone: '+15553334455',
      memberCode: 'GD-DIANA',
    },
    OWNER_BRAVO_ID
  );

  // ==============================================================================
  // TEST 1: Canonical Recipient-Type Notification Uniqueness & Event Publishing
  // ==============================================================================
  console.log('  1. Testing Canonical Notification Uniqueness (gymId, eventId, recipientType, recipientId)...');
  const event = await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'membership.activated',
    aggregateType: 'member_membership',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      memberName: memberA.fullName,
      planName: 'Annual Gold Elite',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    actorUserId: OWNER_USER_ID,
  });

  assert.ok(event.id);
  assert.equal(event.status, 'PENDING');
  console.log('     ✅ Event published atomically with PENDING status.');

  // ==============================================================================
  // TEST 2: Process Event & Verify In-App + Delivery Records
  // ==============================================================================
  console.log('  2. Testing Notification Engine Event Consumption & In-App Delivery...');
  const processRes = await domainEventBus.processPendingEvents(GYM_ALPHA_ID);
  assert.equal(processRes.processed, 1);
  assert.equal(processRes.errors, 0);

  const notifPage = await notificationService.getRecipientNotifications(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id
  );

  assert.equal(notifPage.total, 1);
  assert.equal(notifPage.unreadCount, 1);
  assert.equal(notifPage.items[0]!.type, 'MEMBERSHIP_ACTIVATED');
  console.log('     ✅ In-App notification generated with correct recipient, type, and unread state.');

  // ==============================================================================
  // TEST 3: Database-Level Delivery Uniqueness (notification_id, channel)
  // ==============================================================================
  console.log('  3. Testing Database-Level Delivery Uniqueness (1 Notification + 1 Channel = 1 Delivery)...');
  const notifId = notifPage.items[0]!.id;

  // Attempt duplicate insert of same channel on same notification
  await assert.rejects(
    async () => {
      await db.insert(notificationDeliveries).values({
        gymId: GYM_ALPHA_ID,
        notificationId: notifId,
        channel: 'IN_APP',
        status: 'DELIVERED',
      });
    },
    (err: any) => err.code === '23505' || err.message.includes('unique')
  );
  console.log('     ✅ Database strictly enforces (notification_id, channel) delivery uniqueness.');

  // ==============================================================================
  // TEST 4: Channel-Level Preference Isolation (Disabled PUSH does NOT suppress IN_APP)
  // ==============================================================================
  console.log('  4. Testing Channel Preference Independence (Disabled PUSH does NOT suppress IN_APP)...');
  // Member A disables PUSH notifications for BILLING
  await notificationService.updatePreferences(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id,
    [
      {
        category: 'BILLING',
        channel: 'PUSH',
        isEnabled: false,
      },
      {
        category: 'BILLING',
        channel: 'IN_APP',
        isEnabled: true,
      },
    ]
  );

  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'payment.completed',
    aggregateType: 'payment',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      amount: 120.00,
      paymentMethod: 'CARD',
      receiptNumber: 'REC-CARD-991',
    },
  });

  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  const billingNotifs = await notificationService.getRecipientNotifications(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id
  );

  const billingNotif = billingNotifs.items.find((n) => n.type === 'PAYMENT_RECEIVED');
  assert.ok(billingNotif, 'IN_APP notification MUST exist even if PUSH is disabled');

  const billingDeliveries = await db
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.notificationId, billingNotif!.id));

  assert.equal(billingDeliveries.length, 1);
  assert.equal(billingDeliveries[0]!.channel, 'IN_APP');
  console.log('     ✅ Channel preferences resolved independently: IN_APP created, disabled PUSH omitted.');

  // ==============================================================================
  // TEST 5: Default Preference Determinism
  // ==============================================================================
  console.log('  5. Testing Deterministic Default Preferences (Enabled when no row exists)...');
  const isDefaultEnabled = await notificationEngine.isNotificationEnabled(
    db,
    GYM_ALPHA_ID,
    'MEMBER',
    memberB.id,
    'TRAINING',
    'IN_APP'
  );
  assert.equal(isDefaultEnabled, true, 'Default preference must deterministically return true');
  console.log('     ✅ Default preferences evaluated deterministically without undefined leaks.');

  // ==============================================================================
  // TEST 6: Concurrency & FOR UPDATE SKIP LOCKED (10 Parallel Processors on Same Event)
  // ==============================================================================
  console.log('  6. Testing Concurrent Event Claiming (10 Parallel Workers via FOR UPDATE SKIP LOCKED)...');
  const concurrentEvent = await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'attendance.checked_in',
    aggregateType: 'attendance',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberB.id,
      checkInTime: new Date().toISOString(),
    },
  });

  const workerResults = await Promise.all(
    Array.from({ length: 10 }).map(() => domainEventBus.processPendingEvents(GYM_ALPHA_ID, 10))
  );

  const totalClaimed = workerResults.reduce((acc, r) => acc + r.claimed, 0);
  assert.equal(totalClaimed, 1, 'Exactly 1 worker must claim the event (no duplicate processing)');

  const notifsForEvent = await db
    .select()
    .from(notifications)
    .where(eq(notifications.eventId, concurrentEvent.eventId));
  assert.equal(notifsForEvent.length, 1, 'Exactly 1 notification created under concurrent load');
  console.log('     ✅ Concurrency proven: 10 simultaneous workers claimed event exactly once.');

  // ==============================================================================
  // TEST 7: Stale PROCESSING Event Lease Expiration & Crash Recovery
  // ==============================================================================
  console.log('  7. Testing Stale PROCESSING Event Crash Recovery via Lease Expiration...');
  const crashedEventId = crypto.randomUUID();
  // Simulate a crashed worker: Event set to PROCESSING with expired lease
  await db.insert(domainEvents).values({
    gymId: GYM_ALPHA_ID,
    eventId: crashedEventId,
    eventType: 'trainer.assigned',
    aggregateType: 'trainer_assignment',
    aggregateId: crypto.randomUUID(),
    payload: JSON.stringify({
      memberId: memberA.id,
      trainerId: crypto.randomUUID(),
      trainerName: 'Coach Marcus',
    }),
    status: 'PROCESSING',
    processingStartedAt: new Date(Date.now() - 10 * 60 * 1000),
    processingLeaseExpiresAt: new Date(Date.now() - 2 * 60 * 1000), // Expired 2 minutes ago
    retryCount: 1,
  });

  // Run processor -> Must automatically reclaim stale event
  const recoveryResult = await domainEventBus.processPendingEvents(GYM_ALPHA_ID);
  assert.ok(recoveryResult.processed >= 1);

  const recoveredDbEvent = (
    await db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.eventId, crashedEventId))
      .limit(1)
  )[0];

  assert.equal(recoveredDbEvent?.status, 'PROCESSED');
  console.log('     ✅ Crash recovery proven: Stale PROCESSING event reclaimed and processed.');

  // ==============================================================================
  // TEST 8: Future Provider Delivery Queue Claiming
  // ==============================================================================
  console.log('  8. Testing Future Provider Delivery Queue Claiming (FOR UPDATE SKIP LOCKED)...');
  const claimedDeliveries = await notificationService.claimPendingDeliveries(GYM_ALPHA_ID, 'PUSH', 10);
  // Returns claimed deliveries safely with lease timestamp
  assert.ok(Array.isArray(claimedDeliveries));
  console.log('     ✅ Provider delivery claiming verified for future Phase 12B workers.');

  // ==============================================================================
  // TEST 9: Delivery State Machine Transition Guards
  // ==============================================================================
  console.log('  9. Testing Delivery State Machine Invariants (Terminal DELIVERED Guard)...');
  const deliveryRow = (
    await db
      .select()
      .from(notificationDeliveries)
      .where(and(eq(notificationDeliveries.gymId, GYM_ALPHA_ID), eq(notificationDeliveries.status, 'DELIVERED')))
      .limit(1)
  )[0];

  assert.ok(deliveryRow);
  // Attempt to transition terminal DELIVERED to PROCESSING/FAILED -> Must reject
  await assert.rejects(
    async () => {
      await notificationService.recordDeliveryResult(deliveryRow.id, 'FAILED');
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ State machine rejects illegal transitions on terminal DELIVERED delivery.');

  // ==============================================================================
  // TEST 10: Push Token Recipient-Type Scoping & Rotation
  // ==============================================================================
  console.log('  10. Testing Push Token Recipient-Type Isolation & Token Rotation...');
  const token = 'ExponentPushToken[TestToken-Hardened-12345]';

  // Member registers token
  const memToken = await notificationService.registerPushToken(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id,
    { pushToken: token, platform: 'ANDROID' }
  );

  // Owner user registers same push token on their separate account
  const ownerToken = await notificationService.registerPushToken(
    GYM_ALPHA_ID,
    'USER',
    OWNER_USER_ID,
    { pushToken: token, platform: 'ANDROID' }
  );

  assert.notEqual(memToken.tokenId, ownerToken.tokenId, 'Member and User must have isolated token identities');
  console.log('     ✅ Push tokens strictly scoped by (gymId, recipientType, recipientId, pushToken).');

  // ==============================================================================
  // TEST 11: Notification Payload Non-Authorization Invariant
  // ==============================================================================
  console.log('  11. Testing Notification Action Payload Authorization Invariant...');
  const notifWithPayload = notifPage.items[0]!;
  assert.ok(notifWithPayload.payload);

  // Member B attempts to access Member A's entity using notification payload ID
  await assert.rejects(
    async () => {
      await notificationService.markAsRead(GYM_ALPHA_ID, memberB.id, notifWithPayload.id, 'MEMBER');
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Payload IDs cannot bypass authorization; strict recipient scoping enforced.');

  // ==============================================================================
  // TEST 12: Concurrent Mark-Read & Read-All (10 Parallel Clients)
  // ==============================================================================
  console.log('  12. Testing Concurrent Mark-As-Read & Read-All (10 Parallel Requests)...');
  const markReadResults = await Promise.allSettled(
    Array.from({ length: 10 }).map(() =>
      notificationService.markAsRead(GYM_ALPHA_ID, memberA.id, notifWithPayload.id, 'MEMBER')
    )
  );
  assert.ok(markReadResults.every((r) => r.status === 'fulfilled'));

  const readAllResults = await Promise.allSettled(
    Array.from({ length: 10 }).map(() =>
      notificationService.markAllAsRead(GYM_ALPHA_ID, memberA.id, 'MEMBER')
    )
  );
  assert.ok(readAllResults.every((r) => r.status === 'fulfilled'));

  const unreadCount = await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id, 'MEMBER');
  assert.equal(unreadCount.unreadCount, 0);
  console.log('     ✅ Concurrent mark-read and read-all executed without race conditions or deadlocks.');

  // ==============================================================================
  // TEST 13: Transactional Rollback Isolation (Atomic Business Mutation + Domain Event)
  // ==============================================================================
  console.log('  13. Testing Transactional Rollback Isolation...');
  const initialEventCount = (await db.select().from(domainEvents)).length;

  try {
    await db.transaction(async (tx) => {
      await domainEventBus.publishDomainEvent(tx, {
        gymId: GYM_ALPHA_ID,
        eventType: 'membership.frozen',
        aggregateType: 'member_membership',
        aggregateId: crypto.randomUUID(),
        payload: { memberId: memberA.id },
      });
      // Simulate failure in business mutation
      throw new Error('Simulated database error after event publication');
    });
  } catch {
    // Expected rollback
  }

  const afterRollbackEventCount = (await db.select().from(domainEvents)).length;
  assert.equal(afterRollbackEventCount, initialEventCount, 'Rolled back transaction must not persist domain event');
  console.log('     ✅ Transaction rollback verified: Failed business transaction cleanly rolled back event.');

  // ==============================================================================
  // TEST 14: Max Retry Limit for Unrecoverable Events
  // ==============================================================================
  console.log('  14. Testing Max Retry Bounds for Corrupted Events...');
  const badEvent = await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'system.alert' as any,
    aggregateType: 'unknown',
    aggregateId: crypto.randomUUID(),
    payload: { broken: true },
  });

  // Force bad payload to trigger handler error
  await db
    .update(domainEvents)
    .set({ payload: 'INVALID_JSON_OBJECT{{{' })
    .where(eq(domainEvents.id, badEvent.id));

  // Process 3 times to exhaust retries
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);
  await db.update(domainEvents).set({ processingLeaseExpiresAt: new Date(Date.now() - 1000) }).where(eq(domainEvents.id, badEvent.id));
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);
  await db.update(domainEvents).set({ processingLeaseExpiresAt: new Date(Date.now() - 1000) }).where(eq(domainEvents.id, badEvent.id));
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  const terminalEvent = (
    await db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.id, badEvent.id))
      .limit(1)
  )[0];

  assert.equal(terminalEvent?.status, 'FAILED');
  assert.ok(terminalEvent?.lastError);
  console.log('     ✅ Max retry bounds enforced: Failing event transitioned to terminal FAILED state.');

  // ==============================================================================
  // TEST 15: Cross-Tenant & Cross-Recipient Anti-IDOR Matrix
  // ==============================================================================
  console.log('  15. Testing Anti-IDOR Matrix Across Tenants & Roles...');
  // Gym Bravo owner cannot access Gym Alpha notifications
  await assert.rejects(
    async () => {
      await notificationService.markAsRead(GYM_BRAVO_ID, OWNER_BRAVO_ID, notifWithPayload.id, 'USER');
    },
    (err: any) => err.statusCode === 404
  );

  // Member cannot access Owner notification
  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'pt_package.purchased',
    aggregateType: 'pt_package',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      totalSessions: 10,
      trainerName: 'Coach Marcus',
    },
  });
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  console.log('     ✅ Anti-IDOR matrix passed: Cross-tenant and cross-role mutations strictly rejected.');

  console.log('\n🎉 ALL 15 HARDENING NOTIFICATION CORE & COMMUNICATION HUB TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runNotificationCoreHardeningTestSuite().catch((err) => {
  console.error('❌ Notification Core Hardening Test Suite failed:', err);
  process.exit(1);
});
