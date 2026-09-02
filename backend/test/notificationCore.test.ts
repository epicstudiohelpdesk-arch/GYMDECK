/**
 * GymDeck Phase 12A: Notification Core & Communication Hub Foundation Test Suite
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  notifications,
  notificationDeliveries,
  devicePushTokens,
  auditLogs,
} from '../shared/database/schema';
import { domainEventBus } from '../services/notifications/domainEventBus';
import { notificationEngine } from '../services/notifications/notificationEngine';
import { notificationService } from '../services/notifications/notificationService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runNotificationCoreTestSuite() {
  console.log('🔔 Starting Notification Core & Communication Hub Test Suite (Phase 12A)...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const OWNER_USER_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecureOwnerPass123!');

  // 1. Seed Gyms & Owner User
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

  await db.insert(users).values({
    id: OWNER_USER_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@alphaarena.gym`,
    fullName: 'Master Gym Owner Alpha',
    passwordHash,
    role: 'OWNER',
    permissions: ['reports.read', 'members.read', 'members.write'],
    accountStatus: 'ACTIVE',
  });

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

  const bravoMember = await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Diana Prince',
      phone: '+15553334455',
      memberCode: 'GD-DIANA',
    },
    OWNER_USER_ID
  );

  // ==============================================================================
  // TEST 1: Domain Event Publishing & Persistence
  // ==============================================================================
  console.log('  1. Testing Atomic Domain Event Publishing...');
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
  assert.equal(event.eventType, 'membership.activated');
  console.log('     ✅ Domain event published and persisted with PENDING status.');

  // ==============================================================================
  // TEST 2: Notification Engine Event Consumption & In-App Notification Generation
  // ==============================================================================
  console.log('  2. Testing Notification Engine Event Consumption & Dispatch...');
  const processRes = await domainEventBus.processPendingEvents(GYM_ALPHA_ID);
  assert.equal(processRes.processed, 1);
  assert.equal(processRes.errors, 0);

  // Verify In-App Notification created for member
  const notifPage = await notificationService.getRecipientNotifications(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id
  );

  assert.equal(notifPage.total, 1);
  assert.equal(notifPage.unreadCount, 1);
  assert.equal(notifPage.items[0]!.type, 'MEMBERSHIP_ACTIVATED');
  assert.equal(notifPage.items[0]!.category, 'MEMBERSHIP');
  assert.equal(notifPage.items[0]!.isRead, false);
  console.log('     ✅ In-App notification generated with correct recipient, type, and unread state.');

  // ==============================================================================
  // TEST 3: In-App Delivery Record Verification
  // ==============================================================================
  console.log('  3. Testing In-App Delivery Record State...');
  const deliveries = await db
    .select()
    .from(notificationDeliveries)
    .where(and(eq(notificationDeliveries.gymId, GYM_ALPHA_ID), eq(notificationDeliveries.notificationId, notifPage.items[0]!.id)));

  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0]!.channel, 'IN_APP');
  assert.equal(deliveries[0]!.status, 'DELIVERED');
  console.log('     ✅ In-App delivery record created with DELIVERED status.');

  // ==============================================================================
  // TEST 4: Unread Count Fast Query
  // ==============================================================================
  console.log('  4. Testing Fast Unread Count Aggregation...');
  const unreadCountRes = await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id);
  assert.equal(unreadCountRes.unreadCount, 1);
  console.log('     ✅ Fast unread count returned 1 unread notification.');

  // ==============================================================================
  // TEST 5: Mark Single Notification as Read
  // ==============================================================================
  console.log('  5. Testing Mark as Read (Single Notification)...');
  const readRes = await notificationService.markAsRead(
    GYM_ALPHA_ID,
    memberA.id,
    notifPage.items[0]!.id
  );
  assert.equal(readRes.success, true);
  assert.ok(readRes.readAt);

  const updatedUnread = await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id);
  assert.equal(updatedUnread.unreadCount, 0);

  // Test Repeat mark-as-read idempotency
  const repeatRead = await notificationService.markAsRead(
    GYM_ALPHA_ID,
    memberA.id,
    notifPage.items[0]!.id
  );
  assert.equal(repeatRead.success, true);
  console.log('     ✅ Single notification marked read and verified idempotent.');

  // ==============================================================================
  // TEST 6: Mark All Notifications as Read
  // ==============================================================================
  console.log('  6. Testing Mark All as Read for Recipient...');
  // Publish two more events for memberA
  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'payment.completed',
    aggregateType: 'payment',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      amount: 150.00,
      paymentMethod: 'UPI',
      receiptNumber: 'REC-UPI-99001',
    },
  });
  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'attendance.checked_in',
    aggregateType: 'attendance',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      checkInTime: new Date().toISOString(),
    },
  });

  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  const unreadBefore = await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id);
  assert.equal(unreadBefore.unreadCount, 2);

  const markAllRes = await notificationService.markAllAsRead(GYM_ALPHA_ID, memberA.id);
  assert.equal(markAllRes.success, true);
  assert.equal(markAllRes.count, 2);

  const unreadAfter = await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id);
  assert.equal(unreadAfter.unreadCount, 0);
  console.log('     ✅ All notifications marked read atomically; unread count reduced to 0.');

  // ==============================================================================
  // TEST 7: Notification Preferences Enforcement (Category Suppression)
  // ==============================================================================
  console.log('  7. Testing Notification Preferences Enforcement...');
  // MemberB disables ATTENDANCE category
  await notificationService.updatePreferences(
    GYM_ALPHA_ID,
    'MEMBER',
    memberB.id,
    [
      {
        category: 'ATTENDANCE',
        channel: 'IN_APP',
        isEnabled: false,
      },
    ]
  );

  // Publish attendance event for memberB
  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'attendance.checked_in',
    aggregateType: 'attendance',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberB.id,
      checkInTime: new Date().toISOString(),
    },
  });

  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  // MemberB should NOT have received an attendance notification
  const memberBNotifs = await notificationService.getRecipientNotifications(
    GYM_ALPHA_ID,
    'MEMBER',
    memberB.id
  );
  assert.equal(memberBNotifs.total, 0, 'Disabled category must suppress notification creation');
  console.log('     ✅ Notification preferences respected: Disabled category suppressed notification.');

  // ==============================================================================
  // TEST 8: Device Push Token Registration & Rotation
  // ==============================================================================
  console.log('  8. Testing Device Push Token Registration & Rotation...');
  const tokenRes1 = await notificationService.registerPushToken(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id,
    {
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx1]',
      platform: 'IOS',
      deviceModel: 'iPhone 15 Pro',
      appVersion: '1.0.0',
    }
  );
  assert.ok(tokenRes1.tokenId);

  // Rotate/Update same token with newer metadata
  const tokenRes2 = await notificationService.registerPushToken(
    GYM_ALPHA_ID,
    'MEMBER',
    memberA.id,
    {
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx1]',
      platform: 'IOS',
      deviceModel: 'iPhone 15 Pro',
      appVersion: '1.0.1',
    }
  );
  assert.equal(tokenRes2.tokenId, tokenRes1.tokenId, 'Same token must update existing row without duplicates');

  const tokensInDb = await db
    .select()
    .from(devicePushTokens)
    .where(and(eq(devicePushTokens.gymId, GYM_ALPHA_ID), eq(devicePushTokens.recipientId, memberA.id)));
  assert.equal(tokensInDb.length, 1);
  assert.equal(tokensInDb[0]!.appVersion, '1.0.1');
  console.log('     ✅ Push token registered, rotated, and deduplicated successfully.');

  // ==============================================================================
  // TEST 9 & 10: Anti-IDOR & Recipient Boundary Isolation
  // ==============================================================================
  console.log('  9 & 10. Testing Anti-IDOR & Multi-Tenant Recipient Boundaries...');
  // Member A cannot mark Member B's notification as read
  // Let's create a notification for Member B
  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'payment.completed',
    aggregateType: 'payment',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberB.id,
      amount: 75.00,
      paymentMethod: 'CASH',
      receiptNumber: 'REC-CASH-1002',
    },
  });
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  const memberBNotifList = await notificationService.getRecipientNotifications(
    GYM_ALPHA_ID,
    'MEMBER',
    memberB.id
  );
  assert.equal(memberBNotifList.total, 1);
  const memberBNotifId = memberBNotifList.items[0]!.id;

  // Member A attempts to mark Member B's notification -> Must throw 404/Forbidden
  await assert.rejects(
    async () => {
      await notificationService.markAsRead(GYM_ALPHA_ID, memberA.id, memberBNotifId);
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo attempts to mark Gym Alpha notification -> Must throw 404
  await assert.rejects(
    async () => {
      await notificationService.markAsRead(GYM_BRAVO_ID, bravoMember.id, memberBNotifId);
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Anti-IDOR strictly blocks cross-member and cross-tenant notification access.');

  // ==============================================================================
  // TEST 11: Idempotent Event Processing (Duplicate Event Delivery)
  // ==============================================================================
  console.log('  11. Testing Idempotent Event Processing (Zero Duplicate Notifications)...');
  const duplicateEventId = crypto.randomUUID();
  const eventPayload = {
    memberId: memberA.id,
    planName: 'Silver Plan',
    endDate: new Date().toISOString(),
  };

  // Process event first time
  await db.transaction(async (tx) => {
    await notificationEngine.handleDomainEvent(tx, {
      eventId: duplicateEventId,
      gymId: GYM_ALPHA_ID,
      eventType: 'membership.activated',
      aggregateType: 'member_membership',
      aggregateId: crypto.randomUUID(),
      payload: eventPayload,
      occurredAt: new Date(),
    });
  });

  const countAfterFirst = (
    await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.gymId, GYM_ALPHA_ID), eq(notifications.eventId, duplicateEventId)))
  ).length;
  assert.equal(countAfterFirst, 1);

  // Process exact same eventId second time (e.g. retry / duplicate sync)
  await db.transaction(async (tx) => {
    await notificationEngine.handleDomainEvent(tx, {
      eventId: duplicateEventId,
      gymId: GYM_ALPHA_ID,
      eventType: 'membership.activated',
      aggregateType: 'member_membership',
      aggregateId: crypto.randomUUID(),
      payload: eventPayload,
      occurredAt: new Date(),
    });
  });

  const countAfterSecond = (
    await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.gymId, GYM_ALPHA_ID), eq(notifications.eventId, duplicateEventId)))
  ).length;
  assert.equal(countAfterSecond, 1, 'Duplicate event must not insert duplicate notification');
  console.log('     ✅ Idempotency proven: Duplicate event delivery generated exactly 0 duplicates.');

  // ==============================================================================
  // TEST 12: Concurrency (10 Parallel Mark-Read Requests)
  // ==============================================================================
  console.log('  12. Testing Concurrency (10 Parallel Mark-As-Read Requests)...');
  const raceNotifId = memberBNotifId;
  const raceResults = await Promise.allSettled(
    Array.from({ length: 10 }).map(() =>
      notificationService.markAsRead(GYM_ALPHA_ID, memberB.id, raceNotifId)
    )
  );

  const allFulfilled = raceResults.every((r) => r.status === 'fulfilled');
  assert.ok(allFulfilled, 'All concurrent mark-as-read requests must resolve safely');

  const finalCheck = (
    await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, raceNotifId))
      .limit(1)
  )[0];
  assert.equal(finalCheck?.isRead, true);
  console.log('     ✅ Concurrency proven: Concurrent mark-as-read executed safely without race conditions.');

  // ==============================================================================
  // TEST 13: Audit Logging for Preference Updates
  // ==============================================================================
  console.log('  13. Testing Audit Logging for Preference Mutations...');
  const auditEntries = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.gymId, GYM_ALPHA_ID),
        eq(auditLogs.action, 'NOTIFICATION_PREFERENCES_UPDATED')
      )
    );
  assert.ok(auditEntries.length >= 1);
  console.log('     ✅ Sensitive notification preference mutations recorded in audit logs.');

  console.log('\n🎉 ALL NOTIFICATION CORE & COMMUNICATION HUB TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runNotificationCoreTestSuite().catch((err) => {
  console.error('❌ Notification Core Test Suite failed:', err);
  process.exit(1);
});
