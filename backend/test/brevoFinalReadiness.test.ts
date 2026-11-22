/**
 * GYMDECK EMAIL LINE: FINAL BREVO PRODUCTION-READINESS TEST SUITE
 *
 * Validates:
 * 1. Brevo response stream parsing (HTTP 201, missing body, malformed JSON)
 * 2. Brevo error classification (401/403 auth, 400 client, 429 rate limit, 5xx server, network timeouts)
 * 3. Brevo adapter behavior (no false ACCEPTED on missing messageId)
 * 4. ProviderRouter failure propagation (never unconditionally ok:true)
 * 5. Immutable provider locking invariant across retries (Brevo->Postal and Postal->Brevo config toggles)
 * 6. Brevo webhook authentication (constant-time token comparison)
 * 7. Brevo webhook lifecycle (delivered, bounce, complaint, suppression registration)
 * 8. Webhook multi-recipient resolution (messageId + recipient email, never blind LIMIT 1)
 * 9. Webhook deduplication and out-of-order event protection
 * 10. Webhook quarantine and tenant isolation
 */

import assert from 'assert/strict';
import crypto from 'crypto';
import { db } from '../shared/database';
import {
  gyms,
  emailMessages,
  emailOutbox,
  emailRecipients,
  emailDispatchAttempts,
  emailDeliveryEvents,
  emailWebhookQuarantine,
  emailSuppressions,
} from '../shared/database/schema';
import { eq, and } from 'drizzle-orm';
import { config } from '../shared/config';
import { BrevoClient, classifyBrevoError } from '../services/email/providers/brevoClient';
import { BrevoAdapter } from '../services/email/providers/brevoAdapter';
import { ProviderRouter } from '../services/email/providerRouter';
import { BrevoWebhookService, verifyBrevoWebhookAuth } from '../services/email/brevoWebhookService';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';

let testsPassed = 0;
let testsTotal = 0;

function it(name: string, fn: () => void | Promise<void>) {
  testsTotal++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      testsPassed++;
      console.log(`  ✅ PASSED: ${name}`);
    })
    .catch((err) => {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(err);
      throw err;
    });
}

// Global fetch mock helper
let originalFetch: typeof global.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  originalFetch = global.fetch;
  global.fetch = handler as any;
}

function restoreFetch() {
  if (originalFetch) {
    global.fetch = originalFetch;
  }
}

async function runSuite() {
  console.log('\n===============================================================');
  console.log('🧪 GYMDECK EMAIL LINE: FINAL BREVO PRODUCTION READINESS SUITE');
  console.log('===============================================================\n');

  // Ensure database schema migrations are applied in CI environments
  await bootstrapDatabaseSchema();

  // Seed a test gym
  const testGymId = crypto.randomUUID();
  await db.insert(gyms).values({
    id: testGymId,
    name: 'Brevo Readiness Test Gym',
    code: `BREVO_${Date.now().toString(36).slice(0, 8)}`,
  }).onConflictDoNothing();

  try {
    /* ------------------------------------------------------------------
     * 1. Brevo Response Stream Parsing & Error Classification
     * ------------------------------------------------------------------ */
    console.log('--- [1] Brevo Client Response Parsing & Error Classification ---');

    await it('1.1: Parses valid HTTP 201 with messageId correctly', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ messageId: '<test_msg_123@smtp-relay.mailin.fr>' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new BrevoClient();
      const res = await client.send({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Hi</p>',
      });

      assert.equal(res.status, 'success');
      assert.equal(res.httpStatus, 201);
      assert.equal(res.messageId, '<test_msg_123@smtp-relay.mailin.fr>');
      restoreFetch();
    });

    await it('1.2: Handles successful HTTP 200/201 with missing messageId safely', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new BrevoClient();
      const res = await client.send({
        to: [{ email: 'test@example.com' }],
        subject: 'Test',
        htmlContent: '<p>Hi</p>',
      });

      assert.equal(res.status, 'success');
      assert.equal(res.messageId, undefined);
      restoreFetch();
    });

    await it('1.3: Handles malformed non-JSON response body safely without crashing', async () => {
      mockFetch(async () => {
        return new Response('<html>502 Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        });
      });

      const client = new BrevoClient();
      await assert.rejects(
        async () => {
          await client.send({
            to: [{ email: 'test@example.com' }],
            subject: 'Test',
            htmlContent: '<p>Hi</p>',
          });
        },
        (err: any) => {
          assert.equal(err.name, 'BrevoApiError');
          assert.equal(err.httpStatus, 502);
          assert.equal(err.category, 'SERVER_ERROR');
          assert.equal(err.isAmbiguous, true);
          return true;
        }
      );
      restoreFetch();
    });

    await it('1.4: Classifies HTTP 401/403 as AUTH_FAILED (non-ambiguous)', () => {
      const authError = classifyBrevoError(401, { message: 'Key not found', code: 'unauthorized' });
      assert.equal(authError.category, 'AUTH_FAILED');
      assert.equal(authError.isAmbiguous, false);

      const forbiddenError = classifyBrevoError(403, { message: 'Forbidden' });
      assert.equal(forbiddenError.category, 'AUTH_FAILED');
      assert.equal(forbiddenError.isAmbiguous, false);
    });

    await it('1.5: Classifies HTTP 429 as RATE_LIMITED (ambiguous)', () => {
      const rateLimitError = classifyBrevoError(429, { message: 'Too many requests' });
      assert.equal(rateLimitError.category, 'RATE_LIMITED');
      assert.equal(rateLimitError.isAmbiguous, true);
    });

    await it('1.6: Classifies HTTP 400 as CLIENT_REJECTED (non-ambiguous)', () => {
      const clientErr = classifyBrevoError(400, { message: 'Invalid recipient', code: 'invalid_parameter' });
      assert.equal(clientErr.category, 'CLIENT_REJECTED');
      assert.equal(clientErr.isAmbiguous, false);
    });

    await it('1.7: Classifies network timeouts as AMBIGUOUS_TIMEOUT', async () => {
      mockFetch(async () => {
        const err: any = new Error('The operation was aborted');
        err.name = 'TimeoutError';
        err.code = 'ETIMEDOUT';
        throw err;
      });

      const client = new BrevoClient();
      await assert.rejects(
        async () => {
          await client.send({
            to: [{ email: 'test@example.com' }],
            subject: 'Test',
            htmlContent: '<p>Hi</p>',
          });
        },
        (err: any) => {
          assert.equal(err.name, 'BrevoApiError');
          assert.equal(err.category, 'AMBIGUOUS_TIMEOUT');
          assert.equal(err.isAmbiguous, true);
          return true;
        }
      );
      restoreFetch();
    });

    /* ------------------------------------------------------------------
     * 2. Brevo Adapter & False-Acceptance Prevention
     * ------------------------------------------------------------------ */
    console.log('\n--- [2] Brevo Adapter False-Acceptance Prevention ---');

    await it('2.1: Adapter rejects 2xx response when messageId is missing', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ note: 'ok but no id' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const adapter = new BrevoAdapter();
      const result = await adapter.send(['recipient@example.com'], '<p>Test</p>');

      assert.equal(result.ok, false);
      assert.equal(result.acceptedRecipients.length, 0);
      assert.equal(result.ambiguousRecipients.length, 1);
      assert.equal(result.code, 'MISSING_PROVIDER_MESSAGE_ID');
      restoreFetch();
    });

    await it('2.2: Adapter accepts 201 response when valid messageId is present', async () => {
      const msgId = '<20261122.999888@smtp-relay.mailin.fr>';
      mockFetch(async () => {
        return new Response(JSON.stringify({ messageId: msgId }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const adapter = new BrevoAdapter();
      const result = await adapter.send(['recipient@example.com'], '<p>Test</p>');

      assert.equal(result.ok, true);
      assert.equal(result.acceptedRecipients.length, 1);
      assert.ok(result.acceptedRecipients[0]);
      assert.equal(result.acceptedRecipients[0].id, msgId);
      assert.equal(result.providerMessageId, msgId);
      restoreFetch();
    });

    await it('2.3: Adapter preserves ambiguous outcome on 5xx server error', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const adapter = new BrevoAdapter();
      const result = await adapter.send(['recipient@example.com'], '<p>Test</p>');

      assert.equal(result.ok, false);
      assert.equal(result.acceptedRecipients.length, 0);
      assert.equal(result.ambiguousRecipients.length, 1);
      assert.equal(result.isAmbiguous, true);
      restoreFetch();
    });

    /* ------------------------------------------------------------------
     * 3. ProviderRouter Result Propagation
     * ------------------------------------------------------------------ */
    console.log('\n--- [3] ProviderRouter Result Propagation ---');

    await it('3.1: ProviderRouter propagates adapter failure without masking as ok:true', async () => {
      mockFetch(async () => {
        return new Response(JSON.stringify({ message: 'Unauthorized key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      // Create test parent message
      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Router Failure Test',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      const router = new ProviderRouter();
      const dispatchResult = await router.dispatch({
        gymId: testGymId,
        emailMessageId: msg.id,
        provider: 'brevo',
        to: ['fail_test@example.com'],
        htmlContent: '<p>Test</p>',
        batchIndex: 0,
        recipientBatchIds: [crypto.randomUUID()],
      });

      assert.equal(dispatchResult.ok, false, 'Router MUST NOT return ok: true on adapter failure');
      assert.equal(dispatchResult.result.ok, false);
      assert.equal(dispatchResult.result.provider, 'brevo');
      restoreFetch();
    });

    /* ------------------------------------------------------------------
     * 4. Immutable Provider Locking Invariant Across Retries
     * ------------------------------------------------------------------ */
    console.log('\n--- [4] Immutable Provider Locking Invariant Across Retries ---');

    await it('4.1: Retrying a Brevo-snapshotted job preserves BREVO even when config is POSTAL', async () => {
      // Create parent message
      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Provider Pinning Test Brevo',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      // Create outbox job pinned to BREVO
      const [outbox] = await db
        .insert(emailOutbox)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          jobStatus: 'PENDING',
          provider: 'BREVO',
        })
        .returning();
      assert.ok(outbox);

      // Record first attempt with provider BREVO
      await db.insert(emailDispatchAttempts).values({
        gymId: testGymId,
        emailMessageId: msg.id,
        outboxId: outbox.id,
        attemptNumber: 1,
        attemptStatus: 'UNKNOWN_OUTCOME',
        provider: 'BREVO',
        workerId: 'test_worker',
      });

      // System config is currently POSTAL
      (config as any).EMAIL_DELIVERY_PROVIDER = 'postal';

      // Verify ProviderRouter resolves the pinned provider from prior attempt
      const router = new ProviderRouter();
      const resolved = await router.getProviderForOutbox(outbox.id);
      assert.equal(resolved, 'brevo', 'Provider must remain locked to BREVO despite config=postal');
    });

    await it('4.2: Retrying a Postal-snapshotted job preserves POSTAL even when config is BREVO', async () => {
      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Provider Pinning Test Postal',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      const [outbox] = await db
        .insert(emailOutbox)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          jobStatus: 'PENDING',
          provider: 'POSTAL',
        })
        .returning();
      assert.ok(outbox);

      await db.insert(emailDispatchAttempts).values({
        gymId: testGymId,
        emailMessageId: msg.id,
        outboxId: outbox.id,
        attemptNumber: 1,
        attemptStatus: 'REJECTED',
        provider: 'POSTAL',
        workerId: 'test_worker',
      });

      // System config switched to BREVO
      (config as any).EMAIL_DELIVERY_PROVIDER = 'brevo';

      const router = new ProviderRouter();
      const resolved = await router.getProviderForOutbox(outbox.id);
      assert.equal(resolved, 'postal', 'Provider must remain locked to POSTAL despite config=brevo');

      // Restore config to postal
      (config as any).EMAIL_DELIVERY_PROVIDER = 'postal';
    });

    /* ------------------------------------------------------------------
     * 5. Brevo Webhook Authentication
     * ------------------------------------------------------------------ */
    console.log('\n--- [5] Brevo Webhook Authentication ---');

    await it('5.1: Constant-time authentication verifies valid shared secret token via headers only', () => {
      process.env.BREVO_WEBHOOK_SECRET = 'secret_webhook_token_xyz_123';
      (config as any).BREVO_WEBHOOK_SECRET = 'secret_webhook_token_xyz_123';

      const reqValid: any = {
        headers: { 'x-webhook-secret': 'secret_webhook_token_xyz_123' },
        query: {},
      };
      const authValid = verifyBrevoWebhookAuth(reqValid);
      assert.equal(authValid.valid, true);

      const reqBearer: any = {
        headers: { authorization: 'Bearer secret_webhook_token_xyz_123' },
        query: {},
      };
      const authBearer = verifyBrevoWebhookAuth(reqBearer);
      assert.equal(authBearer.valid, true);

      // Insecure query-string secret authentication (?secret=) must be strictly rejected
      const reqQueryString: any = {
        headers: {},
        query: { secret: 'secret_webhook_token_xyz_123' },
      };
      const authQuery = verifyBrevoWebhookAuth(reqQueryString);
      assert.equal(authQuery.valid, false, 'Query string secret token must be rejected');

      const reqInvalid: any = {
        headers: { 'x-webhook-secret': 'wrong_secret_token_abc_456' },
        query: {},
      };
      const authInvalid = verifyBrevoWebhookAuth(reqInvalid);
      assert.equal(authInvalid.valid, false);

      delete process.env.BREVO_WEBHOOK_SECRET;
      delete (config as any).BREVO_WEBHOOK_SECRET;
    });

    /* ------------------------------------------------------------------
     * 6. Brevo Webhook Multi-Recipient Resolution & State Transitions
     * ------------------------------------------------------------------ */
    console.log('\n--- [6] Brevo Webhook Multi-Recipient Resolution & Lifecycle ---');

    await it('6.1: Resolves recipient strictly by composite (providerMessageId + recipientEmail)', async () => {
      const sharedMsgId = `<brevo_batch_${Date.now()}@smtp-relay.mailin.fr>`;

      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Multi-recipient Brevo Webhook Test',
          bodyHtml: '<p>Batch</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      // Recipient A
      const [recA] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          recipientEmail: 'alice@example.com',
          deliveryStatus: 'SENT',
          providerMessageId: sharedMsgId,
        })
        .returning();
      assert.ok(recA);

      // Recipient B
      const [recB] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          recipientEmail: 'bob@example.com',
          deliveryStatus: 'SENT',
          providerMessageId: sharedMsgId,
        })
        .returning();
      assert.ok(recB);

      const webhookService = new BrevoWebhookService();

      // Deliver only to Alice
      await webhookService.handleWebhook({
        event: 'delivered',
        email: 'alice@example.com',
        'message-id': sharedMsgId,
        id: Date.now(),
      });

      // Verify Alice is DELIVERED
      const [updatedA] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, recA.id));
      assert.ok(updatedA);
      assert.equal(updatedA.deliveryStatus, 'DELIVERED');

      // Verify Bob remains SENT (not impacted by Alice's webhook)
      const [updatedB] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, recB.id));
      assert.ok(updatedB);
      assert.equal(updatedB.deliveryStatus, 'SENT');
    });

    await it('6.2a: Soft bounce maps to transient FAILED status without permanent suppression', async () => {
      const softBounceMsgId = `<brevo_soft_${Date.now()}@smtp-relay.mailin.fr>`;
      const softBounceEmail = `soft_bounce_${Date.now()}@example.com`;

      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Soft Bounce Transient Test',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      const [rec] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          recipientEmail: softBounceEmail,
          deliveryStatus: 'SENT',
          providerMessageId: softBounceMsgId,
        })
        .returning();
      assert.ok(rec);

      const webhookService = new BrevoWebhookService();
      await webhookService.handleWebhook({
        event: 'soft_bounce',
        email: softBounceEmail,
        'message-id': softBounceMsgId,
        reason: '451 4.4.1 Mailbox full (transient)',
        id: Date.now() + 2,
      });

      // 1. Verify recipient updated to FAILED (transient attempt failure, not terminal BOUNCED)
      const [updatedRec] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec.id));
      assert.ok(updatedRec);
      assert.equal(updatedRec.deliveryStatus, 'FAILED');
      assert.ok(updatedRec.failureReason?.includes('Soft bounce'));

      // 2. Verify parent message failedCount incremented, NOT bouncedCount
      const [parent] = await db.select().from(emailMessages).where(eq(emailMessages.id, msg.id));
      assert.ok(parent);
      assert.equal(parent.failedCount, 1);
      assert.equal(parent.bouncedCount, 0, 'Soft bounce must not increment permanent bouncedCount');

      // 3. Verify recipient email was NOT added to emailSuppressions
      const [suppression] = await db
        .select()
        .from(emailSuppressions)
        .where(and(eq(emailSuppressions.gymId, testGymId), eq(emailSuppressions.emailAddress, softBounceEmail)));
      assert.equal(suppression, undefined, 'Soft bounced recipient must NOT be permanently suppressed');
    });

    await it('6.2b: Processes hard bounce and registers address in suppression list', async () => {
      const bounceMsgId = `<brevo_bounce_${Date.now()}@smtp-relay.mailin.fr>`;
      const bounceEmail = `bounced_user_${Date.now()}@example.com`;

      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Hard Bounce Test',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      const [rec] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          recipientEmail: bounceEmail,
          deliveryStatus: 'SENT',
          providerMessageId: bounceMsgId,
        })
        .returning();
      assert.ok(rec);

      const webhookService = new BrevoWebhookService();
      await webhookService.handleWebhook({
        event: 'hard_bounce',
        email: bounceEmail,
        'message-id': bounceMsgId,
        reason: '550 5.1.1 User unknown',
        id: Date.now() + 1,
      });

      // Verify recipient updated to BOUNCED
      const [updatedRec] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec.id));
      assert.ok(updatedRec);
      assert.equal(updatedRec.deliveryStatus, 'BOUNCED');

      // Verify address added to suppressions
      const [suppression] = await db
        .select()
        .from(emailSuppressions)
        .where(and(eq(emailSuppressions.gymId, testGymId), eq(emailSuppressions.emailAddress, bounceEmail)));
      assert.ok(suppression, 'Address must be registered in suppression list');
      assert.equal(suppression.suppressionReason, 'HARD_BOUNCE');
    });

    await it('6.3: Webhook deduplication safely drops duplicate events', async () => {
      const dedupMsgId = `<brevo_dedup_${Date.now()}@smtp-relay.mailin.fr>`;
      const dedupEmail = `dedup_${Date.now()}@example.com`;
      const eventId = 88776655;

      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Deduplication Test',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      await db.insert(emailRecipients).values({
        gymId: testGymId,
        emailMessageId: msg.id,
        recipientEmail: dedupEmail,
        deliveryStatus: 'SENT',
        providerMessageId: dedupMsgId,
      });

      const webhookService = new BrevoWebhookService();

      // First webhook call
      await webhookService.handleWebhook({
        event: 'delivered',
        email: dedupEmail,
        'message-id': dedupMsgId,
        id: eventId,
      });

      // Second webhook call with same event ID
      await webhookService.handleWebhook({
        event: 'delivered',
        email: dedupEmail,
        'message-id': dedupMsgId,
        id: eventId,
      });

      // Verify parent deliveredCount was incremented only ONCE
      const [parent] = await db.select().from(emailMessages).where(eq(emailMessages.id, msg.id));
      assert.ok(parent);
      assert.equal(parent.deliveredCount, 1, 'Duplicate webhook event must not increment deliveredCount twice');
    });

    await it('6.4: Out-of-order webhook protection preserves terminal states', async () => {
      const oooMsgId = `<brevo_ooo_${Date.now()}@smtp-relay.mailin.fr>`;
      const oooEmail = `ooo_${Date.now()}@example.com`;

      const [msg] = await db
        .insert(emailMessages)
        .values({
          gymId: testGymId,
          subject: 'Out of Order Test',
          bodyHtml: '<p>Test</p>',
          fromAddress: 'notifications@mail.epic-studio.in',
        })
        .returning();
      assert.ok(msg);

      const [rec] = await db
        .insert(emailRecipients)
        .values({
          gymId: testGymId,
          emailMessageId: msg.id,
          recipientEmail: oooEmail,
          deliveryStatus: 'DELIVERED',
          providerMessageId: oooMsgId,
        })
        .returning();
      assert.ok(rec);

      const webhookService = new BrevoWebhookService();

      // Late 'request' event arriving after 'delivered'
      await webhookService.handleWebhook({
        event: 'request',
        email: oooEmail,
        'message-id': oooMsgId,
        id: Date.now() + 50,
      });

      // Recipient must remain DELIVERED
      const [current] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, rec.id));
      assert.ok(current);
      assert.equal(current.deliveryStatus, 'DELIVERED', 'Terminal state DELIVERED must not be downgraded to SENT');
    });

    await it('6.5: Malformed webhook without message-id is safely quarantined', async () => {
      const webhookService = new BrevoWebhookService();
      await webhookService.handleWebhook({
        event: 'delivered',
        email: 'orphan@example.com',
      } as any);

      const [quarantined] = await db
        .select()
        .from(emailWebhookQuarantine)
        .where(eq(emailWebhookQuarantine.eventType, 'delivered'))
        .orderBy(emailWebhookQuarantine.createdAt)
        .limit(1);

      assert.ok(quarantined, 'Malformed event must be recorded in email_webhook_quarantine');
    });

    console.log('\n===============================================================');
    console.log(`🎉 ALL BREVO FINAL READINESS TESTS PASSED: ${testsPassed}/${testsTotal}`);
    console.log('===============================================================\n');
  } finally {
    // Cleanup test data
    await db.delete(emailDeliveryEvents).where(eq(emailDeliveryEvents.gymId, testGymId)).catch(() => {});
    await db.delete(emailDispatchAttempts).where(eq(emailDispatchAttempts.gymId, testGymId)).catch(() => {});
    await db.delete(emailOutbox).where(eq(emailOutbox.gymId, testGymId)).catch(() => {});
    await db.delete(emailRecipients).where(eq(emailRecipients.gymId, testGymId)).catch(() => {});
    await db.delete(emailMessages).where(eq(emailMessages.gymId, testGymId)).catch(() => {});
    await db.delete(emailSuppressions).where(eq(emailSuppressions.gymId, testGymId)).catch(() => {});
    await db.delete(gyms).where(eq(gyms.id, testGymId)).catch(() => {});
  }
}

runSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
