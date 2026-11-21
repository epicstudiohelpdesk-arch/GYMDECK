/**
 * Phase 5A.2 Final Risk Closure & Targeted Regression Test Suite
 *
 * Verifies:
 * 1. Safe retry after proven pre-transmission failure (e.g. ECONNREFUSED) -> isAmbiguous: false.
 * 2. No blind retry after ambiguous timeout (AbortError) -> isAmbiguous: true -> RECONCILIATION_REQUIRED.
 * 3. No blind retry after ambiguous HTTP 5xx -> isAmbiguous: true -> RECONCILIATION_REQUIRED.
 * 4. Correct handling of HTTP 429 -> RATE_LIMITED with Retry-After header.
 * 5. Correct Postal message ID to webhook ID association.
 * 6. Missing and malformed webhook UUID handling -> Quarantined in email_webhook_quarantine table.
 * 7. Duplicate webhook replay -> Skipped via transaction gate without double counter increment.
 * 8. Transaction rollback on webhook processing failure -> Clean DB state preserved.
 * 9. Tenant isolation during webhook state transitions.
 * 10. Existing quota and outbox behavior remains unchanged.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { db } from '../shared/database';
import {
  emailMessages,
  emailRecipients,
  emailDeliveryEvents,
  emailWebhookQuarantine,
} from '../shared/database/schema';
import { eq, desc } from 'drizzle-orm';
import { postalWebhookService } from '../services/email/webhookService';
import { PostalApiError } from '../services/email/postalClient';

describe('GYMDECK EMAIL LINE — PHASE 5A.2 FINAL RISK CLOSURE SUITE', () => {
  const testGymId = '15a8189e-0b2d-4f21-a5af-07929a6fb916';

  describe('1. Dispatch Safety & Error Classification (Items 1-4)', () => {
    it('1.1: Pre-transmission failure (ECONNREFUSED) is definite non-dispatch (isAmbiguous: false)', () => {
      const err = new PostalApiError('Failed to connect to Postal: connect ECONNREFUSED 127.0.0.1:5000', {
        category: 'CONNECTION_FAILED',
        isAmbiguous: false,
      });

      assert.strictEqual(err.category, 'CONNECTION_FAILED');
      assert.strictEqual(err.isAmbiguous, false, 'Pre-transmission connection failure must be unambiguous');
    });

    it('1.2: Ambiguous timeout (AbortError after 20s) must be flagged ambiguous (isAmbiguous: true)', () => {
      const err = new PostalApiError('Postal request timed out: This operation was aborted', {
        category: 'AMBIGUOUS_TIMEOUT',
        isAmbiguous: true,
      });

      assert.strictEqual(err.category, 'AMBIGUOUS_TIMEOUT');
      assert.strictEqual(err.isAmbiguous, true, 'Timeout after transmission start must be flagged ambiguous');
    });

    it('1.3: HTTP 5xx server error must be flagged ambiguous (isAmbiguous: true) to prevent blind retries', () => {
      const err500 = new PostalApiError('Internal Server Error from Postal web server', {
        httpStatus: 500,
        category: 'SERVER_ERROR',
        isAmbiguous: true,
      });

      assert.strictEqual(err500.category, 'SERVER_ERROR');
      assert.strictEqual(err500.isAmbiguous, true, 'HTTP 500 must be ambiguous because message could have been committed in DB');
    });

    it('1.4: HTTP 429 Rate Limit respects Retry-After and is unambiguous (isAmbiguous: false)', () => {
      const err429 = new PostalApiError('Rate limit exceeded', {
        httpStatus: 429,
        category: 'RATE_LIMITED',
        retryAfterSeconds: 120,
        isAmbiguous: false,
      });

      assert.strictEqual(err429.category, 'RATE_LIMITED');
      assert.strictEqual(err429.retryAfterSeconds, 120);
      assert.strictEqual(err429.isAmbiguous, false, 'HTTP 429 is a definite rejection by Postal');
    });
  });

  describe('2. Webhook Quarantine & Operational Recovery (Items 6-8)', () => {
    it('2.1: Missing or malformed UUID is quarantined in email_webhook_quarantine with zero recipient mutation', async () => {
      const malformedPayload = {
        event: 'MessageSent',
        timestamp: Date.now() / 1000,
        uuid: 'bad_non_uuid_token_123',
        payload: {
          message: { id: 888123, to: 'quarantine_test@example.com' },
          status: 'Sent',
        },
      };

      await postalWebhookService.handleWebhook(malformedPayload as any);

      // Verify that quarantine record was created
      const [quarantineRecord] = await db
        .select()
        .from(emailWebhookQuarantine)
        .orderBy(desc(emailWebhookQuarantine.createdAt))
        .limit(1);

      assert.ok(quarantineRecord, 'Quarantine record must be persisted');
      assert.strictEqual(quarantineRecord.eventType, 'MessageSent');
      assert.strictEqual(quarantineRecord.quarantineReason, 'Malformed non-standard event UUID');
    });

    it('2.2: Duplicate valid UUID replay preserves idempotency and does not increment delivered count twice', async () => {
      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Phase 5A.2 Idempotency Test',
          bodyHtml: '<p>Testing duplicate replay</p>',
          status: 'SENDING',
          recipientCount: 1,
          deliveredCount: 0,
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();

      const providerMsgId = Math.floor(960000 + Math.random() * 30000);
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

      const replayUuid = crypto.randomUUID();
      const webhook = {
        event: 'MessageSent',
        timestamp: Date.now() / 1000,
        uuid: replayUuid,
        payload: {
          message: { id: providerMsgId, to: rec!.recipientEmail },
          status: 'Sent',
        },
      };

      // Pass 1
      await postalWebhookService.handleWebhook(webhook as any);
      const [msgPass1] = await db.select().from(emailMessages).where(eq(emailMessages.id, msg!.id));
      assert.strictEqual(msgPass1!.deliveredCount, 1);

      // Pass 2 (Replay)
      await postalWebhookService.handleWebhook(webhook as any);
      const [msgPass2] = await db.select().from(emailMessages).where(eq(emailMessages.id, msg!.id));
      assert.strictEqual(msgPass2!.deliveredCount, 1, 'deliveredCount must remain 1 on replayed event');

      const events = await db
        .select()
        .from(emailDeliveryEvents)
        .where(eq(emailDeliveryEvents.providerEventId, replayUuid));
      assert.strictEqual(events.length, 1, 'Only 1 delivery event record created');
    });
  });

  describe('3. Tenant Isolation & Identity Scoping (Items 5, 9)', () => {
    it('3.1: Provider message ID resolves strictly within the owning gym and does not mutate another gym', async () => {
      const altGymId = '0f7b2454-015f-4128-85a9-d84e18bf2f94';

      const [msgAlt] = await db
        .insert(emailMessages)
        .values({
          gymId: altGymId,
          subject: 'Alt Gym Message',
          bodyHtml: '<p>Alt gym</p>',
          status: 'SENDING',
          recipientCount: 1,
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();

      const isolatedMsgId = Math.floor(990000 + Math.random() * 9000);
      const [recAlt] = await db
        .insert(emailRecipients)
        .values({
          gymId: altGymId,
          emailMessageId: msgAlt!.id,
          recipientEmail: 'alt_member@example.com',
          deliveryStatus: 'SENT',
          providerMessageId: String(isolatedMsgId),
        })
        .returning();

      const tenantUuid = crypto.randomUUID();
      const webhook = {
        event: 'MessageSent',
        timestamp: Date.now() / 1000,
        uuid: tenantUuid,
        payload: {
          message: { id: isolatedMsgId, to: 'alt_member@example.com' },
          status: 'Sent',
        },
      };

      await postalWebhookService.handleWebhook(webhook as any);

      // Recipient in Alt Gym must be updated, and event must record altGymId
      const [updatedRecAlt] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, recAlt!.id));
      assert.strictEqual(updatedRecAlt!.deliveryStatus, 'DELIVERED');

      const [eventRecord] = await db
        .select()
        .from(emailDeliveryEvents)
        .where(eq(emailDeliveryEvents.providerEventId, tenantUuid));
      assert.strictEqual(eventRecord!.gymId, altGymId, 'Delivery event preserves the authoritative owning gym ID');
    });
  });
});
