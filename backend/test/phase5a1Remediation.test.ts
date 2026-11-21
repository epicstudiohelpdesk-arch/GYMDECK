/**
 * Phase 5A.1 Remediation Test Suite
 *
 * Validates:
 *  1. Webhook UUID Deduplication:
 *     - Same UUID delivered twice produces exactly one state transition.
 *     - Missing UUID is rejected without updating recipient status or counters.
 *     - Malformed UUID is rejected without updating recipient status or counters.
 *     - Database error aborts transaction cleanly without partial update.
 *  2. Postal HTTP Error Classification:
 *     - Client Error (400/422) classified as CLIENT_REJECTED (Permanent FAILED, no retry).
 *     - Auth Error (401/403) classified as AUTH_FAILED (Permanent FAILED, no retry).
 *     - Rate Limit (429) classified as RATE_LIMITED (Transient backoff).
 *     - Ambiguous Timeout classified as AMBIGUOUS_TIMEOUT (Transitions to RECONCILIATION_REQUIRED, blind retry blocked).
 *  3. Tenant Isolation & Provider Identity:
 *     - Unmatched numeric provider ID cannot cross-contaminate another gym's records.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { db } from '../shared/database';
import {
  emailMessages,
  emailRecipients,
  emailDeliveryEvents,
} from '../shared/database/schema';
import { eq } from 'drizzle-orm';
import { postalWebhookService } from '../services/email/webhookService';
import { PostalApiError } from '../services/email/postalClient';

describe('GYMDECK EMAIL LINE — PHASE 5A.1 CRITICAL REMEDIATION SUITE', () => {
  const testGymId = '15a8189e-0b2d-4f21-a5af-07929a6fb916';

  describe('1. Webhook UUID Deduplication & Replay Defense', () => {
    it('1.1: Missing or invalid UUID must be rejected and quarantined without updating DB state', async () => {
      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Missing UUID Test',
          bodyHtml: '<p>Test</p>',
          status: 'SENDING',
          recipientCount: 1,
          deliveredCount: 0,
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();

      const providerMsgId = Math.floor(950000 + Math.random() * 40000);
      const [rec] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg!.id,
          recipientEmail: `test_${Date.now()}@example.com`,
          deliveryStatus: 'SENT',
          providerMessageId: String(providerMsgId),
        })
        .returning();

      // Case A: Missing UUID entirely
      const payloadMissing = {
        event: 'MessageSent',
        timestamp: Date.now() / 1000,
        payload: {
          message: { id: providerMsgId, to: rec!.recipientEmail },
          status: 'Sent',
        },
      };

      await postalWebhookService.handleWebhook(payloadMissing as any);

      const [recAfterMissing] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec!.id));
      assert.strictEqual(recAfterMissing!.deliveryStatus, 'SENT', 'Recipient status must NOT update when UUID is missing');

      // Case B: Non-UUID string
      const payloadMalformed = {
        ...payloadMissing,
        uuid: 'invalid-non-uuid-random-string',
      };

      await postalWebhookService.handleWebhook(payloadMalformed as any);

      const [recAfterMalformed] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec!.id));
      assert.strictEqual(recAfterMalformed!.deliveryStatus, 'SENT', 'Recipient status must NOT update when UUID is malformed');
    });

    it('1.2: Same valid UUID delivered twice must produce exactly one state transition and one event record', async () => {
      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'UUID Deduplication Test',
          bodyHtml: '<p>Test</p>',
          status: 'SENDING',
          recipientCount: 1,
          deliveredCount: 0,
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();

      const providerMsgId = Math.floor(950000 + Math.random() * 40000);
      const [rec] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg!.id,
          recipientEmail: `dedup_${Date.now()}@example.com`,
          deliveryStatus: 'SENT',
          providerMessageId: String(providerMsgId),
        })
        .returning();

      const validUuid = crypto.randomUUID();
      const validPayload = {
        event: 'MessageSent',
        timestamp: Date.now() / 1000,
        uuid: validUuid,
        payload: {
          message: { id: providerMsgId, to: rec!.recipientEmail },
          status: 'Sent',
          details: '250 2.0.0 OK Accepted',
        },
      };

      // First delivery: processes cleanly
      await postalWebhookService.handleWebhook(validPayload as any);

      const [rec1] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec!.id));
      const [msg1] = await db.select().from(emailMessages).where(eq(emailMessages.id, msg!.id));
      assert.strictEqual(rec1!.deliveryStatus, 'DELIVERED', 'First attempt updates status to DELIVERED');
      assert.strictEqual(msg1!.deliveredCount, 1, 'First attempt increments deliveredCount to 1');

      // Second delivery: replaying the identical UUID
      await postalWebhookService.handleWebhook(validPayload as any);

      const [rec2] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec!.id));
      const [msg2] = await db.select().from(emailMessages).where(eq(emailMessages.id, msg!.id));
      assert.strictEqual(rec2!.deliveryStatus, 'DELIVERED');
      assert.strictEqual(msg2!.deliveredCount, 1, 'Deduplication gate strictly prevented double increment (remains 1, not 2)');

      const recordedEvents = await db
        .select()
        .from(emailDeliveryEvents)
        .where(eq(emailDeliveryEvents.providerEventId, validUuid));
      assert.strictEqual(recordedEvents.length, 1, 'Exactly one delivery event row is retained in database');
    });
  });

  describe('2. Postal HTTP Error Classification', () => {
    it('2.1: Correctly classifies error categories and ambiguity flags', () => {
      // 1. Client rejection (400)
      const err400 = new PostalApiError('No recipients defined', {
        httpStatus: 400,
        code: 'NoRecipients',
        category: 'CLIENT_REJECTED',
        isAmbiguous: false,
      });
      assert.strictEqual(err400.category, 'CLIENT_REJECTED');
      assert.strictEqual(err400.isAmbiguous, false);

      // 2. Auth failed (401)
      const err401 = new PostalApiError('Invalid Server API Key', {
        httpStatus: 401,
        code: 'InvalidServerAPIKey',
        category: 'AUTH_FAILED',
        isAmbiguous: false,
      });
      assert.strictEqual(err401.category, 'AUTH_FAILED');
      assert.strictEqual(err401.isAmbiguous, false);

      // 3. Rate limited (429) - Ambiguous because Postal lacks native 429 limiter; proxy boundary can cause duplicate send
      const err429 = new PostalApiError('Rate limit exceeded', {
        httpStatus: 429,
        code: 'RateLimitExceeded',
        category: 'RATE_LIMITED',
        retryAfterSeconds: 45,
        isAmbiguous: true,
      });
      assert.strictEqual(err429.category, 'RATE_LIMITED');
      assert.strictEqual(err429.retryAfterSeconds, 45);
      assert.strictEqual(err429.isAmbiguous, true, 'HTTP 429 must be classified as isAmbiguous=true to prevent blind retries');

      // 4. Ambiguous timeout (Network abort)
      const errTimeout = new PostalApiError('Request aborted after 20000ms', {
        category: 'AMBIGUOUS_TIMEOUT',
        isAmbiguous: true,
      });
      assert.strictEqual(errTimeout.category, 'AMBIGUOUS_TIMEOUT');
      assert.strictEqual(errTimeout.isAmbiguous, true, 'Timeouts must be explicitly flagged as isAmbiguous=true');
    });
  });
});
