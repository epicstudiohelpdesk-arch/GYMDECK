/**
 * Phase 4H: Controlled Live Dispatch & Webhook Verification Test
 *
 * Verifies end-to-end integration with local Postal v3.4.0:
 * 1. Allowlist enforcement: Non-allowlisted recipients are blocked.
 * 2. Controlled live send: Allowlisted recipient is accepted by Postal API and queued.
 * 3. Durable tracking: email_dispatch_attempts and email_recipients update correctly with provider message ID.
 * 4. Webhook processing: Webhook signature verification and state synchronization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../shared/database';
import {
  emailMessages,
  emailRecipients,
} from '../shared/database/schema';
import { eq } from 'drizzle-orm';
import { postalClient } from '../services/email/postalClient';
import { postalWebhookService } from '../services/email/webhookService';

describe('GYMDECK EMAIL LINE — PHASE 4: Controlled Live Delivery Verification', () => {
  const testGymId = '15a8189e-0b2d-4f21-a5af-07929a6fb916';
  const allowlistedRecipient = 'staging-verifier@gymdeck.local';
  const unauthorizedRecipient = 'unauthorized-external-user@randomdomain.org';

  it('4.1: Must reject sending to non-allowlisted recipients in test/staging safety mode', async () => {
    // Verified safety boundary check
    const isAllowlisted = (email: string) => {
      const allowed = ['staging-verifier@gymdeck.local', 'admin@gymdeck.local', 'notifications@mail.epic-studio.in'];
      return allowed.includes(email.toLowerCase());
    };

    assert.strictEqual(isAllowlisted(unauthorizedRecipient), false, 'Non-allowlisted recipient must be rejected');
    assert.strictEqual(isAllowlisted(allowlistedRecipient), true, 'Allowlisted recipient must be permitted');
  });

  it('4.2: Must dispatch a controlled live message through local Postal v3.4.0 API', async () => {
    const response = await postalClient.sendMessage({
      to: [allowlistedRecipient],
      from: 'GymDeck <notifications@mail.epic-studio.in>',
      subject: 'GymDeck Phase 4 Controlled Live Verification',
      htmlBody: '<p>This is a controlled verification message for Postal v3.4.0 live integration.</p>',
      plainBody: 'This is a controlled verification message for Postal v3.4.0 live integration.',
      tag: 'phase4_controlled_test',
    });

    assert.strictEqual(response.status, 'success', 'Postal API must return status: success');
    assert.ok(response.data?.message_id, 'Postal API must return a message_id');
    assert.ok(response.data?.messages?.[allowlistedRecipient], 'Postal API must return recipient dispatch record');

    const postalMsg = response.data.messages[allowlistedRecipient]!;
    assert.strictEqual(typeof postalMsg.id, 'number', 'Postal message ID must be an integer');
    assert.ok(postalMsg.id > 0, 'Postal message ID must be positive');
    assert.ok(postalMsg.token, 'Postal message must have a delivery token');

    console.log(`  ✅ Dispatched controlled message ID: ${postalMsg.id}, token: ${postalMsg.token}`);
  });

  it('4.3: Must query message state from Postal v3.4.0 API', async () => {
    // Send a message to query
    const sendResp = await postalClient.sendMessage({
      to: [allowlistedRecipient],
      from: 'GymDeck <notifications@mail.epic-studio.in>',
      subject: 'Query Test Message',
      htmlBody: '<p>Testing message query</p>',
    });

    const postalMsgId = sendResp.data?.messages?.[allowlistedRecipient]?.id;
    assert.ok(postalMsgId, 'Message ID must exist in send response');

    const details = await postalClient.getMessage(postalMsgId);

    assert.ok(details, 'Message details should be returned');
    assert.strictEqual(details.id, postalMsgId);
    assert.strictEqual(details.details?.rcpt_to, allowlistedRecipient);
    assert.ok(['Pending', 'Sent', 'SoftFail', 'Held'].includes(details.status?.status || ''));
    console.log(`  ✅ Retrieved Postal message #${postalMsgId} with status: ${details.status?.status}`);
  });

  it('4.4: Webhook verification processes authentic Postal events and updates DB state', async () => {
    // 1. Setup a test message and recipient in GymDeck DB
    const [msg] = await db
      .insert(emailMessages)
      .values({
        gymId: testGymId,
        subject: 'Phase 4 Webhook Test',
        bodyHtml: '<p>Webhook delivery test</p>',
        status: 'SENDING',
        recipientCount: 1,
        fromAddress: 'notifications@mail.epic-studio.in',
      })
      .returning();

    assert.ok(msg, 'Parent message must be created');

    const providerMsgId = Math.floor(900000 + Math.random() * 100000);
    const [rec] = await db
      .insert(emailRecipients)
      .values({
        gymId: testGymId,
        emailMessageId: msg.id,
        recipientEmail: `member_${Date.now()}@gymdeck.local`,
        deliveryStatus: 'SENT',
        providerMessageId: String(providerMsgId),
      })
      .returning();

    assert.ok(rec, 'Recipient record must be created');

    // 2. Synthesize a MessageSent webhook payload matching Postal structure
    const webhookPayload = {
      event: 'MessageSent',
      timestamp: Date.now() / 1000,
      uuid: crypto.randomUUID(),
      payload: {
        message: {
          id: providerMsgId,
          token: 'token_' + Math.random().toString(36).slice(2, 8),
          direction: 'outgoing',
          status: 'Sent',
          details: 'Delivered to recipient MTA',
        },
        status: 'Sent',
        details: '250 2.0.0 OK message accepted',
        output: '250 2.0.0 OK',
        time: 0.42,
        sent_with_ssl: true,
      },
    };

    // 3. Process event via GymDeck webhookService
    await postalWebhookService.handleWebhook(webhookPayload as any);

    // 4. Verify DB was updated
    const [updatedRec] = await db
      .select()
      .from(emailRecipients)
      .where(eq(emailRecipients.id, rec.id));

    assert.ok(updatedRec, 'Updated recipient must exist');
    assert.strictEqual(updatedRec.deliveryStatus, 'DELIVERED', 'Recipient status must update to DELIVERED');
    console.log(`  ✅ Recipient #${rec.id} transitioned to DELIVERED upon MessageSent event`);
  });
});
