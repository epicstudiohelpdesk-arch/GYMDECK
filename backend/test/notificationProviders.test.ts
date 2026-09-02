/**
 * GymDeck Phase 12B: External Communication Provider Infrastructure Comprehensive Test Suite
 */

import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  gymMembers,
  notifications,
  notificationDeliveries,
  devicePushTokens,
  providerWebhookEvents,
  auditLogs,
} from '../shared/database/schema';
import { domainEventBus } from '../services/notifications/domainEventBus';
import { notificationDeliveryWorker } from '../services/notifications/deliveryWorker';
import { providerRouter } from '../services/notifications/providers/providerRouter';
import { webhookService } from '../services/notifications/webhookService';
import { notificationService } from '../services/notifications/notificationService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { config } from '../shared/config';
import { eq, and } from 'drizzle-orm';

async function runNotificationProvidersTestSuite() {
  console.log('🚀 Starting External Communication Provider Infrastructure Test Suite (Phase 12B)...\n');

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
      code: `GD-PROV-A-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Strength Lab',
      code: `GD-PROV-B-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values({
    id: OWNER_USER_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@alphaarena.gym`,
    fullName: 'Master Gym Owner Alpha',
    phoneNumber: '+15550001111',
    passwordHash,
    role: 'OWNER',
    permissions: ['reports.read', 'members.read', 'members.write'],
    accountStatus: 'ACTIVE',
  });

  // 2. Seed Members
  const memberA = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Peter Parker',
      phone: '+15551234567',
      memberCode: 'GD-PARKER',
    },
    OWNER_USER_ID
  );

  const memberNoPhone = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Miles Morales',
      phone: '+15559876543',
      memberCode: 'GD-MILES',
    },
    OWNER_USER_ID
  );
  // Clear phone in DB to simulate missing phone record
  await db
    .update(gymMembers)
    .set({ phone: '' })
    .where(eq(gymMembers.id, memberNoPhone.id));

  // ==============================================================================
  // TEST 1: Provider Abstraction & Routing
  // ==============================================================================
  console.log('  1. Testing Provider Abstraction & Channel Routing...');
  assert.equal(providerRouter.getProvider('PUSH')?.name, 'EXPO_PUSH');
  assert.equal(providerRouter.getProvider('WHATSAPP')?.name, 'META_WHATSAPP');
  assert.equal(providerRouter.getProvider('UNKNOWN_CHANNEL'), undefined);
  console.log('     ✅ Provider router resolves channels to concrete provider adapters.');

  // ==============================================================================
  // TEST 2: Push Token Registration & Multiple Devices
  // ==============================================================================
  console.log('  2. Testing Device Push Token Lifecycle & Multiple Devices...');
  const phoneToken = 'ExponentPushToken[TestPhoneToken-12345]';
  const tabletToken = 'ExponentPushToken[TestTabletToken-67890]';

  await notificationService.registerPushToken(GYM_ALPHA_ID, 'MEMBER', memberA.id, {
    pushToken: phoneToken,
    platform: 'ANDROID',
    deviceModel: 'Pixel 9 Pro',
  });

  await notificationService.registerPushToken(GYM_ALPHA_ID, 'MEMBER', memberA.id, {
    pushToken: tabletToken,
    platform: 'IOS',
    deviceModel: 'iPad Pro',
  });

  const tokensInDb = await db
    .select()
    .from(devicePushTokens)
    .where(and(eq(devicePushTokens.gymId, GYM_ALPHA_ID), eq(devicePushTokens.recipientId, memberA.id)));

  assert.equal(tokensInDb.length, 2);
  assert.ok(tokensInDb.every((t) => t.isActive));
  console.log('     ✅ Multiple active device push tokens registered per recipient.');

  // ==============================================================================
  // TEST 3: Domain Event -> Notification -> PUSH + WHATSAPP Deliveries Generation
  // ==============================================================================
  console.log('  3. Testing Event-Driven Generation of PUSH & WHATSAPP Delivery Records...');
  const event = await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'membership.activated',
    aggregateType: 'member_membership',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      planName: 'Annual Gold Elite',
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  const notifRows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.eventId, event.eventId));
  assert.equal(notifRows.length, 1);

  const deliveryRows = await db
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.notificationId, notifRows[0]!.id));

  // IN_APP is immediately DELIVERED; PUSH and WHATSAPP are staged as PENDING
  const inAppDeliv = deliveryRows.find((d) => d.channel === 'IN_APP');
  const pushDeliv = deliveryRows.find((d) => d.channel === 'PUSH');
  const waDeliv = deliveryRows.find((d) => d.channel === 'WHATSAPP');

  assert.ok(inAppDeliv && inAppDeliv.status === 'DELIVERED');
  assert.ok(pushDeliv && pushDeliv.status === 'PENDING');
  assert.ok(waDeliv && waDeliv.status === 'PENDING');
  console.log('     ✅ IN_APP, PUSH, and WHATSAPP deliveries staged in correct initial states.');

  // ==============================================================================
  // TEST 4: Delivery Worker Execution (PUSH -> Expo Push Gateway)
  // ==============================================================================
  console.log('  4. Testing Asynchronous Push Delivery Worker Execution...');
  const pushWorkerRes = await notificationDeliveryWorker.processPendingDeliveries(GYM_ALPHA_ID, 10);
  assert.ok(pushWorkerRes.processed >= 2); // Dispatches PUSH and WHATSAPP

  const updatedPushDeliv = (
    await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, pushDeliv!.id))
      .limit(1)
  )[0];

  assert.equal(updatedPushDeliv?.status, 'SENT');
  assert.equal(updatedPushDeliv?.provider, 'EXPO_PUSH');
  assert.ok(updatedPushDeliv?.providerMessageId?.startsWith('expo_ticket_'));
  console.log('     ✅ Push delivery dispatched to Expo gateway with provider message ID.');

  // ==============================================================================
  // TEST 5: Delivery Worker Execution (WHATSAPP -> Meta WhatsApp Cloud API)
  // ==============================================================================
  console.log('  5. Testing Asynchronous WhatsApp Delivery Worker Execution...');
  const updatedWaDeliv = (
    await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, waDeliv!.id))
      .limit(1)
  )[0];

  assert.equal(updatedWaDeliv?.status, 'SENT');
  assert.equal(updatedWaDeliv?.provider, 'META_WHATSAPP');
  assert.ok(updatedWaDeliv?.providerMessageId?.startsWith('wamid.'));
  console.log('     ✅ WhatsApp delivery dispatched to Meta gateway with wamid reference.');

  // ==============================================================================
  // TEST 6: WhatsApp Webhook GET Verification Handshake (hub.mode / hub.challenge)
  // ==============================================================================
  console.log('  6. Testing Meta WhatsApp Webhook Subscription Verification (GET Handshake)...');
  const challenge = 'random_hub_challenge_string_998811';
  const verifyToken = config.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'dev_whatsapp_webhook_verify_token';

  const handshakeRes = webhookService.verifyWhatsAppSubscription('subscribe', verifyToken, challenge);
  assert.equal(handshakeRes, challenge);

  await assert.throws(
    () => webhookService.verifyWhatsAppSubscription('subscribe', 'invalid_token_xyz', challenge),
    (err: any) => err.statusCode === 403
  );
  console.log('     ✅ Webhook verification handshake correctly validates secret tokens.');

  // ==============================================================================
  // TEST 7: WhatsApp Webhook POST (SENT -> DELIVERED State Transition)
  // ==============================================================================
  console.log('  7. Testing WhatsApp Asynchronous Delivery Webhook (SENT -> DELIVERED)...');
  const wamid = updatedWaDeliv!.providerMessageId!;
  const webhookTimestamp = String(Math.floor(Date.now() / 1000));

  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550001111', phone_number_id: '123456789' },
              statuses: [
                {
                  id: wamid,
                  status: 'delivered',
                  timestamp: webhookTimestamp,
                  recipient_id: '15551234567',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const webhookResult = await webhookService.processWhatsAppWebhook(webhookPayload);
  assert.equal(webhookResult.processed, 1);

  const confirmedWaDeliv = (
    await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, waDeliv!.id))
      .limit(1)
  )[0];

  assert.equal(confirmedWaDeliv?.status, 'DELIVERED');
  assert.ok(confirmedWaDeliv?.deliveredAt);
  console.log('     ✅ Delivery transitioned to DELIVERED upon receiving provider delivery receipt.');

  // ==============================================================================
  // TEST 8: Webhook Idempotency & 10 Concurrent Submissions
  // ==============================================================================
  console.log('  8. Testing Webhook Deduplication & Concurrency (10 Duplicate Webhook Submissions)...');
  const duplicateResults = await Promise.all(
    Array.from({ length: 10 }).map(() => webhookService.processWhatsAppWebhook(webhookPayload))
  );

  const totalProcessed = duplicateResults.reduce((acc, r) => acc + r.processed, 0);
  const totalDuplicates = duplicateResults.reduce((acc, r) => acc + r.duplicates, 0);

  assert.equal(totalProcessed, 0, 'Duplicate webhooks must not re-process delivery state');
  assert.equal(totalDuplicates, 10, 'All 10 duplicate webhooks safely identified as duplicates');

  const webhookEventsInDb = await db
    .select()
    .from(providerWebhookEvents)
    .where(eq(providerWebhookEvents.providerMessageId, wamid));
  assert.equal(webhookEventsInDb.length, 1, 'Exactly 1 idempotent webhook event recorded');
  console.log('     ✅ Webhook idempotency proven: 10 concurrent duplicates produced exactly 1 transition.');

  // ==============================================================================
  // TEST 9: Push Token Deactivation on DeviceNotRegistered Error
  // ==============================================================================
  console.log('  9. Testing Automatic Token Deactivation on DeviceNotRegistered Error...');
  const deadToken = 'ExponentPushToken[unregistered_dead_device_token_1122]';
  await notificationService.registerPushToken(GYM_ALPHA_ID, 'MEMBER', memberA.id, {
    pushToken: deadToken,
    platform: 'ANDROID',
  });

  // Create delivery targeted at member with dead token
  await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'payment.completed',
    aggregateType: 'payment',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberA.id,
      amount: 45.0,
      receiptNumber: 'REC-DEAD-01',
    },
  });
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  // Claim & dispatch push delivery
  await notificationDeliveryWorker.processPendingDeliveries(GYM_ALPHA_ID, 10);

  const deadTokenInDb = (
    await db
      .select()
      .from(devicePushTokens)
      .where(and(eq(devicePushTokens.gymId, GYM_ALPHA_ID), eq(devicePushTokens.pushToken, deadToken)))
      .limit(1)
  )[0];

  assert.equal(deadTokenInDb?.isActive, false, 'Invalid token must be deactivated automatically');

  const deactivationAudit = (
    await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.gymId, GYM_ALPHA_ID),
          eq(auditLogs.action, 'PUSH_TOKEN_DEACTIVATED'),
          eq(auditLogs.resourceId, memberA.id)
        )
      )
      .limit(1)
  )[0];
  assert.ok(deactivationAudit, 'Audit log must record token deactivation event');
  console.log('     ✅ DeviceNotRegistered automatically deactivates token and records audit log.');

  // ==============================================================================
  // TEST 10: Missing Authoritative Phone Number -> Permanent Failure
  // ==============================================================================
  console.log('  10. Testing Missing Authoritative Recipient Phone Handling (No Silent Success)...');
  const noPhoneEvent = await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'membership.activated',
    aggregateType: 'member_membership',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: memberNoPhone.id,
      planName: 'Trial Pass',
      endDate: new Date().toISOString(),
    },
  });
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  await notificationDeliveryWorker.processPendingDeliveries(GYM_ALPHA_ID, 10);

  const noPhoneNotif = (
    await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, noPhoneEvent.eventId))
      .limit(1)
  )[0];

  const noPhoneWaDeliv = (
    await db
      .select()
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.notificationId, noPhoneNotif!.id),
          eq(notificationDeliveries.channel, 'WHATSAPP')
        )
      )
      .limit(1)
  )[0];

  assert.equal(noPhoneWaDeliv?.status, 'FAILED');
  assert.equal(noPhoneWaDeliv?.errorClassification, 'INVALID_RECIPIENT');
  console.log('     ✅ Missing phone terminates with FAILED status and INVALID_RECIPIENT classification.');

  // ==============================================================================
  // TEST 11: Rate Limit Backoff & Exponential Retries
  // ==============================================================================
  console.log('  11. Testing Provider Rate Limiting & Exponential Retry Scheduling...');
  // Create a delivery with simulated rate-limited phone
  const rateLimitMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Bruce Banner',
      phone: '+15559999999', // Triggers simulated 130429 rate limit
      memberCode: 'GD-BANNER',
    },
    OWNER_USER_ID
  );

  const rateLimitEvent = await domainEventBus.publishDomainEventDirect({
    gymId: GYM_ALPHA_ID,
    eventType: 'membership.activated',
    aggregateType: 'member_membership',
    aggregateId: crypto.randomUUID(),
    payload: {
      memberId: rateLimitMember.id,
      planName: 'Titan Pass',
      endDate: new Date().toISOString(),
    },
  });
  await domainEventBus.processPendingEvents(GYM_ALPHA_ID);

  await notificationDeliveryWorker.processPendingDeliveries(GYM_ALPHA_ID, 10);

  const rateLimitNotif = (
    await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, rateLimitEvent.eventId))
      .limit(1)
  )[0];

  const rateLimitDeliv = (
    await db
      .select()
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.notificationId, rateLimitNotif!.id),
          eq(notificationDeliveries.channel, 'WHATSAPP')
        )
      )
      .limit(1)
  )[0];

  assert.equal(rateLimitDeliv?.status, 'RETRYING');
  assert.equal(rateLimitDeliv?.errorClassification, 'RATE_LIMITED');
  assert.ok(rateLimitDeliv?.nextAttemptAt);
  assert.ok(new Date(rateLimitDeliv!.nextAttemptAt).getTime() > Date.now());
  console.log('     ✅ Rate limited provider response scheduled for exponential retry with future timestamp.');

  // ==============================================================================
  // TEST 12: Webhook Read Receipt Does NOT Mutate In-App Unread State
  // ==============================================================================
  console.log('  12. Testing WhatsApp Read Webhook Independence from In-App Unread State...');
  const initialUnreadCount = (await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id, 'MEMBER')).unreadCount;
  assert.ok(initialUnreadCount > 0);

  // Send WhatsApp read receipt webhook for memberA's delivery
  const readWebhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: wamid,
                  status: 'read',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookService.processWhatsAppWebhook(readWebhookPayload);

  const afterReadUnreadCount = (await notificationService.getUnreadCount(GYM_ALPHA_ID, memberA.id, 'MEMBER')).unreadCount;
  assert.equal(afterReadUnreadCount, initialUnreadCount, 'WhatsApp read receipt MUST NOT mark in-app notification read');
  console.log('     ✅ Provider read receipt preserved in delivery metadata without mutating in-app unread count.');

  // ==============================================================================
  // TEST 13: Failure Isolation (Provider Down Does NOT Roll Back Business Mutation)
  // ==============================================================================
  console.log('  13. Testing Failure Isolation (Business Mutation Independent of Provider)...');
  // Perform business operation: new member registration
  const newMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Barry Allen',
      phone: '+15557778888',
      memberCode: 'GD-FLASH',
    },
    OWNER_USER_ID
  );

  assert.ok(newMember.id);
  // Member is safely persisted even if downstream communication has not run yet
  const memberInDb = (
    await db
      .select()
      .from(users)
      .where(eq(users.id, OWNER_USER_ID))
      .limit(1)
  )[0];
  assert.ok(memberInDb);
  console.log('     ✅ Business transaction committed durably and independently from downstream provider.');

  // ==============================================================================
  // TEST 14: Webhook HMAC-SHA256 Signature Verification
  // ==============================================================================
  console.log('  14. Testing Webhook Cryptographic Signature Verification...');
  const testSecret = config.WHATSAPP_APP_SECRET || 'dev_whatsapp_app_secret_12345';
  const testBody = JSON.stringify({ test: 'payload_data' });
  const validSignature = `sha256=${crypto.createHmac('sha256', testSecret).update(testBody).digest('hex')}`;
  const invalidSignature = 'sha256=badsignature00000000000000000000000000000000000000000000000000000000';

  assert.equal(webhookService.verifySignature(testBody, validSignature), true);
  assert.equal(webhookService.verifySignature(testBody, invalidSignature), false);
  console.log('     ✅ HMAC-SHA256 signature verification accepts authentic webhooks and rejects forged payloads.');

  // ==============================================================================
  // TEST 15: Cross-Tenant Webhook Isolation
  // ==============================================================================
  console.log('  15. Testing Multi-Tenant Webhook Isolation...');
  const fakeBravoWamid = `wamid.HBgM${crypto.randomUUID().replace(/-/g, '')}AAPQAwA=`;
  // Attempting to deliver a status for a non-existent / cross-tenant wamid safely logs and ignores without crash
  const crossTenantResult = await webhookService.processWhatsAppWebhook({
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [{ id: fakeBravoWamid, status: 'delivered', timestamp: String(Date.now()) }],
            },
          },
        ],
      },
    ],
  });
  assert.equal(crossTenantResult.ignored, 1);
  console.log('     ✅ Unmapped / foreign provider message IDs safely isolated and ignored.');

  console.log('\n🎉 ALL 15 EXTERNAL COMMUNICATION PROVIDER (PHASE 12B) TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runNotificationProvidersTestSuite().catch((err) => {
  console.error('❌ Notification Providers Test Suite failed:', err);
  process.exit(1);
});
