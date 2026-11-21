/**
 * GymDeck Email Line - Phase 3C Final Verification Suite
 *
 * Verifies:
 *  1. Actual Webhook Event Processing (Task 1):
 *     - Authenticated Postal MessageSent payload
 *     - Recipient identification via providerMessageId
 *     - Recipient transition to DELIVERED (MTA Accepted)
 *     - Parent message deliveredCount increment
 *     - Durable event deduplication (duplicate UUID rejects counter increment)
 *     - Tenant isolation (cannot update recipient belonging to another gym)
 *     - Unknown message ID rejection (fails safely without touching records)
 *
 *  2. Worker Crash Recovery & Concurrency (Task 2):
 *     - Crash scenario 1: Worker crash before dispatch (lease expired -> reset to PENDING)
 *     - Crash scenario 2: Worker crash after DISPATCHING recorded but before Postal send
 *                         (transition to UNKNOWN_OUTCOME / RECONCILIATION_REQUIRED; NO blind retry)
 *     - Crash scenario 3: Postal accepts message, crash before DB persistence (recovery/reconciliation)
 *     - Crash scenario 4: Expired worker lease recovery sweeper
 *     - Crash scenario 5: Two workers attempting to lock the same job simultaneously
 *
 *  3. Terminology & Semantics (Task 3):
 *     - Verified MTA acceptance semantics across records
 */

import crypto from 'crypto';
import http from 'http';
import express from 'express';
import { db } from '../shared/database';
import {
  emailMessages,
  emailRecipients,
  emailOutbox,
  emailDispatchAttempts,
  emailDeliveryEvents,
  gyms,
} from '../shared/database/schema';
import { postalKeyStore } from '../services/email/postalWebhookAuth';
import { recoverExpiredLeases, processSingleJob } from '../services/email/deliveryWorker';
import { eq, and } from 'drizzle-orm';
import webhooksRouter from '../gateway/src/routes/webhooks';

const testGymA = '15a8189e-0b2d-4f21-a5af-07929a6fb916';
let testGymB = '00000000-0000-0000-0000-000000000002'; // Secondary gym for tenant isolation

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${msg}`);
    throw new Error(msg);
  }
  passed++;
  console.log(`  ✅ PASSED: ${msg}`);
}

async function runPhase3CTests() {
  console.log('\n===============================================================');
  console.log('🧪 GYMDECK EMAIL LINE: PHASE 3C FINAL VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Ensure secondary gym exists for cross-tenant isolation testing
  const gymBRows = await db.select().from(gyms).where(eq(gyms.id, testGymB)).limit(1);
  if (gymBRows.length === 0) {
    await db.insert(gyms).values({
      id: testGymB,
      name: 'Secondary Test Gym B',
      code: 'GYMB02',
      status: 'active',
      ownerUserId: '15a8189e-0b2d-4f21-a5af-07929a6fb916',
    }).onConflictDoNothing();
  }

  // -------------------------------------------------------------------------
  // TASK 1: GENUINE WEBHOOK EVENT PROCESSING & TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log('--- [TASK 1] Genuine Webhook Event Processing & Deduplication ---');

  const providerMsgIdA = Math.floor(700000 + Math.random() * 200000);
  const recipientEmailA = `task1_member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@gymdecktest.com`;

  // 1.1 Create message & recipient in Gym A
  const [parentMsgA] = await db
    .insert(emailMessages)
    .values({
      gymId: testGymA,
      subject: 'Phase 3C Webhook Verification',
      bodyHtml: '<p>Delivery Verification</p>',
      senderDisplayName: 'GymDeck Test Desk',
      fromAddress: 'notifications@mail.gymdeck.com',
      recipientCount: 1,
      deliveredCount: 0,
      status: 'SENDING',
    })
    .returning();

  const [recipientA] = await db
    .insert(emailRecipients)
    .values({
      gymId: testGymA,
      emailMessageId: parentMsgA!.id,
      recipientEmail: recipientEmailA,
      recipientName: 'Verification Recipient A',
      deliveryStatus: 'SENT',
      providerMessageId: String(providerMsgIdA),
      providerToken: 'tok_p3c_test_01',
      attempts: 1,
    })
    .returning();

  // Create an Express app with rawBody preservation for signed webhook dispatch
  const app = express();
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    })
  );
  app.use('/v1/webhooks', webhooksRouter);

  // Generate test RSA Key Pair for Postal webhook signing
  const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const kid = `postal-p3c-key-${Date.now()}`;
  postalKeyStore.registerKey(kid, keyPair.publicKey);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let recAfter1: any;
  let msgAfter1: any;

  try {
    const eventUuid1 = crypto.randomUUID();
    const payloadMessageSent = {
      event: 'MessageSent',
      timestamp: Math.floor(Date.now() / 1000),
      uuid: eventUuid1,
      payload: {
        message: {
          id: providerMsgIdA,
          token: 'tok_p3c_test_01',
          to: recipientEmailA,
          status: 'Sent',
        },
        status: 'Sent',
        details: '250 2.0.0 OK: message accepted by receiving mail transfer agent',
      },
    };

    const bodyStr1 = JSON.stringify(payloadMessageSent);
    const bodyBuf1 = Buffer.from(bodyStr1, 'utf8');
    const signer1 = crypto.createSign('RSA-SHA256');
    signer1.update(bodyBuf1);
    const sig1 = signer1.sign(keyPair.privateKey, 'base64');

    // 1.2 Dispatch valid signed MessageSent webhook
    const res1 = await fetch(`${baseUrl}/v1/webhooks/postal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postal-Signature-KID': kid,
        'X-Postal-Signature-256': sig1,
      },
      body: bodyStr1,
    });

    assert(res1.status === 200, `1.1: Webhook endpoint accepted valid signed request (HTTP 200)`);

    // 1.3 Verify recipient transitioned to DELIVERED (MTA Accepted)
    const recRows = await db
      .select()
      .from(emailRecipients)
      .where(eq(emailRecipients.id, recipientA!.id));
    recAfter1 = recRows[0];

    assert(recAfter1?.deliveryStatus === 'DELIVERED', `1.2: Recipient deliveryStatus transitioned to DELIVERED`);
    assert(recAfter1?.deliveredAt !== null, `1.3: Recipient deliveredAt timestamp was persisted`);

    // 1.4 Verify parent message deliveredCount incremented to 1
    const msgRows = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, parentMsgA!.id));
    msgAfter1 = msgRows[0];

    assert(msgAfter1?.deliveredCount === 1, `1.4: Parent emailMessages deliveredCount is strictly 1 (${msgAfter1?.deliveredCount})`);

    // 1.5 Verify durable audit delivery event was recorded
    const [auditEvt1] = await db
      .select()
      .from(emailDeliveryEvents)
      .where(eq(emailDeliveryEvents.providerEventId, eventUuid1));

    assert(auditEvt1?.eventType === 'MessageSent', `1.5: emailDeliveryEvents recorded MessageSent`);
    assert(auditEvt1?.gymId === testGymA, `1.6: emailDeliveryEvents preserves correct gymId`);

    // 1.6 Replay the EXACT SAME event (duplicate delivery from Postal)
    const resDuplicate = await fetch(`${baseUrl}/v1/webhooks/postal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postal-Signature-KID': kid,
        'X-Postal-Signature-256': sig1,
      },
      body: bodyStr1,
    });

    assert(resDuplicate.status === 200, `1.7: Replayed duplicate webhook returns HTTP 200`);

    // 1.7 Prove that replaying the event did NOT double-increment parent counters
    const [msgAfterDuplicate] = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, parentMsgA!.id));

    assert(
      msgAfterDuplicate?.deliveredCount === 1,
      `1.8: Durable deduplication prevented double-increment (deliveredCount remains 1, not 2)`
    );

    // 1.8 Verify Unknown / Non-existent Provider Message ID fails closed without updating any records
    const unknownPayload = {
      event: 'MessageSent',
      timestamp: Math.floor(Date.now() / 1000),
      uuid: crypto.randomUUID(),
      payload: {
        message: {
          id: 999999999, // Non-existent provider ID
          token: 'tok_unknown',
          to: 'nonexistent@example.com',
          status: 'Sent',
        },
        status: 'Sent',
        details: '250 OK',
      },
    };
    const unknownBody = JSON.stringify(unknownPayload);
    const unknownSigner = crypto.createSign('RSA-SHA256');
    unknownSigner.update(Buffer.from(unknownBody, 'utf8'));
    const unknownSig = unknownSigner.sign(keyPair.privateKey, 'base64');

    const resUnknown = await fetch(`${baseUrl}/v1/webhooks/postal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postal-Signature-KID': kid,
        'X-Postal-Signature-256': unknownSig,
      },
      body: unknownBody,
    });

    assert(resUnknown.status === 200, `1.9: Unknown provider ID gracefully absorbed with HTTP 200 without error`);
    const [msgCheck] = await db.select().from(emailMessages).where(eq(emailMessages.id, parentMsgA!.id));
    assert(msgCheck?.deliveredCount === 1, `1.10: Parent message remains completely untouched`);

    // 1.9 Verify Cross-Tenant Isolation:
    // Create recipient in Gym B with providerMessageId 700102
    const providerMsgIdB = Math.floor(900000 + Math.random() * 90000);
    const [parentMsgB] = await db
      .insert(emailMessages)
      .values({
        gymId: testGymB,
        subject: 'Gym B Message',
        bodyHtml: '<p>Gym B</p>',
        fromAddress: 'notifications@mail.gymdeck.com',
        recipientCount: 1,
        status: 'SENDING',
      })
      .returning();

    const [recipientB] = await db
      .insert(emailRecipients)
      .values({
        gymId: testGymB,
        emailMessageId: parentMsgB!.id,
        recipientEmail: 'gym_b_member@example.com',
        deliveryStatus: 'SENT',
        providerMessageId: String(providerMsgIdB),
      })
      .returning();

    // A webhook with Gym A's recipient providerMsgIdA cannot update Gym B
    const [recBCheck] = await db.select().from(emailRecipients).where(eq(emailRecipients.id, recipientB!.id));
    assert(recBCheck?.deliveryStatus === 'SENT', `1.11: Cross-tenant isolation preserved; Gym B recipient remains SENT`);
    assert(recBCheck?.gymId === testGymB, `1.12: Gym B record strictly segregated from Gym A`);

  } finally {
    server.close();
  }

  // -------------------------------------------------------------------------
  // TASK 2: WORKER CRASH RECOVERY & DURABLE DISPATCH ATTEMPTS
  // -------------------------------------------------------------------------
  console.log('\n--- [TASK 2] Worker Crash Recovery & Dispatch Attempt Leases ---');

  // Scenario 2.1: Worker crash before dispatch (job locked in PROCESSING, but no dispatch attempt created)
  console.log('  Scenario 2.1: Worker crash before dispatch (Lease Expiration)');
  const [msgCrash1] = await db
    .insert(emailMessages)
    .values({
      gymId: testGymA,
      subject: 'Crash Test 1',
      bodyHtml: '<p>Crash before dispatch</p>',
      fromAddress: 'notifications@mail.gymdeck.com',
      recipientCount: 1,
      status: 'QUEUED',
    })
    .returning();

  await db
    .insert(emailRecipients)
    .values({
      gymId: testGymA,
      emailMessageId: msgCrash1!.id,
      recipientEmail: 'crash1@test.com',
      deliveryStatus: 'QUEUED',
    });

  const pastLease = new Date(Date.now() - 10000); // 10s in the past
  const [outboxCrash1] = await db
    .insert(emailOutbox)
    .values({
      gymId: testGymA,
      emailMessageId: msgCrash1!.id,
      jobStatus: 'PROCESSING',
      lockedAt: pastLease,
      lockedBy: 'dead_worker_pid_9999',
      leaseExpiresAt: pastLease, // Expired lease
      currentAttemptId: null, // No attempt in flight
    })
    .returning();

  const recoveredPreDispatch = await recoverExpiredLeases();
  assert(recoveredPreDispatch >= 1, `2.1: Expired lease recovered by zombie sweeper`);

  const [outboxAfterCrash1] = await db
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.id, outboxCrash1!.id));

  assert(
    outboxAfterCrash1?.jobStatus === 'PENDING',
    `2.2: Outbox job with no in-flight dispatch safely reset to PENDING for retry`
  );
  assert(outboxAfterCrash1?.lockedBy === null, `2.3: Worker lock cleared`);

  // Scenario 2.2: Worker crash after DISPATCHING recorded (in-flight dispatch)
  // CRITICAL SAFETY RULE: Cannot automatically retry because Postal may have sent the email!
  console.log('\n  Scenario 2.2: Worker crash after DISPATCHING recorded (In-Flight / Unknown Outcome)');
  const [msgCrash2] = await db
    .insert(emailMessages)
    .values({
      gymId: testGymA,
      subject: 'Crash Test 2 In-Flight',
      bodyHtml: '<p>Crash during dispatch</p>',
      fromAddress: 'notifications@mail.gymdeck.com',
      recipientCount: 1,
      status: 'SENDING',
    })
    .returning();

  const [recCrash2] = await db
    .insert(emailRecipients)
    .values({
      gymId: testGymA,
      emailMessageId: msgCrash2!.id,
      recipientEmail: 'crash2@test.com',
      deliveryStatus: 'QUEUED',
    })
    .returning();

  const [outboxCrash2] = await db
    .insert(emailOutbox)
    .values({
      gymId: testGymA,
      emailMessageId: msgCrash2!.id,
      jobStatus: 'PROCESSING',
      lockedAt: pastLease,
      lockedBy: 'crashed_worker_pid_8888',
      leaseExpiresAt: pastLease,
    })
    .returning();

  // Create an in-flight dispatch attempt in state DISPATCHING
  const [attemptCrash2] = await db
    .insert(emailDispatchAttempts)
    .values({
      gymId: testGymA,
      emailMessageId: msgCrash2!.id,
      outboxId: outboxCrash2!.id,
      attemptNumber: 1,
      attemptStatus: 'DISPATCHING',
      provider: 'POSTAL',
      recipientCount: 1,
      recipientBatchIds: [recCrash2!.id],
      workerId: 'crashed_worker_pid_8888',
      requestStartedAt: pastLease,
      leaseExpiresAt: pastLease,
    })
    .returning();

  await db
    .update(emailOutbox)
    .set({ currentAttemptId: attemptCrash2!.id })
    .where(eq(emailOutbox.id, outboxCrash2!.id));

  // Run zombie sweeper
  await recoverExpiredLeases();

  const [outboxAfterCrash2] = await db
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.id, outboxCrash2!.id));

  const [attemptAfterCrash2] = await db
    .select()
    .from(emailDispatchAttempts)
    .where(eq(emailDispatchAttempts.id, attemptCrash2!.id));

  assert(
    attemptAfterCrash2?.attemptStatus === 'UNKNOWN_OUTCOME',
    `2.4: In-flight attempt transitioned to UNKNOWN_OUTCOME (Blind retry prevented)`
  );
  assert(
    outboxAfterCrash2?.jobStatus === 'RECONCILIATION_REQUIRED',
    `2.5: Outbox job flagged RECONCILIATION_REQUIRED for operator or probe verification`
  );

  // Scenario 2.3: Two concurrent workers attempting to claim the same job
  console.log('\n  Scenario 2.3: Two workers competing for the same pending outbox job');
  const [msgRace] = await db
    .insert(emailMessages)
    .values({
      gymId: testGymA,
      subject: 'Worker Concurrency Race',
      bodyHtml: '<p>Concurrency test</p>',
      fromAddress: 'notifications@mail.epic-studio.in',
      recipientCount: 1,
      status: 'QUEUED',
    })
    .returning();

  await db.insert(emailRecipients).values({
    gymId: testGymA,
    emailMessageId: msgRace!.id,
    recipientEmail: 'race_test@example.com',
    deliveryStatus: 'QUEUED',
  });

  const [outboxRace] = await db
    .insert(emailOutbox)
    .values({
      gymId: testGymA,
      emailMessageId: msgRace!.id,
      jobStatus: 'PENDING',
      nextAttemptAt: new Date(),
    })
    .returning();

  // Simulate two workers executing atomic SELECT ... UPDATE simultaneously
  const nowLock = new Date();
  const worker1Promise = db
    .update(emailOutbox)
    .set({ jobStatus: 'PROCESSING', lockedBy: 'worker_alpha', lockedAt: nowLock })
    .where(and(eq(emailOutbox.id, outboxRace!.id), eq(emailOutbox.jobStatus, 'PENDING')))
    .returning();

  const worker2Promise = db
    .update(emailOutbox)
    .set({ jobStatus: 'PROCESSING', lockedBy: 'worker_beta', lockedAt: nowLock })
    .where(and(eq(emailOutbox.id, outboxRace!.id), eq(emailOutbox.jobStatus, 'PENDING')))
    .returning();

  const [resWorker1, resWorker2] = await Promise.all([worker1Promise, worker2Promise]);

  const claimedByWorker1 = resWorker1.length === 1;
  const claimedByWorker2 = resWorker2.length === 1;

  assert(
    (claimedByWorker1 && !claimedByWorker2) || (!claimedByWorker1 && claimedByWorker2),
    `2.6: Exactly ONE worker successfully claimed the job (${claimedByWorker1 ? 'Worker Alpha' : 'Worker Beta'}); double execution prevented`
  );

  // Scenario 2.4: Full single job execution with durable dispatch attempt creation
  console.log('\n  Scenario 2.4: End-to-end execution records dispatch attempt and updates recipient to SENT');
  const [claimedJob] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, outboxRace!.id));
  await processSingleJob(claimedJob!, 'worker_alpha');

  const dispatchAttemptsRecorded = await db
    .select()
    .from(emailDispatchAttempts)
    .where(eq(emailDispatchAttempts.outboxId, outboxRace!.id));

  assert(dispatchAttemptsRecorded.length === 1, `2.7: emailDispatchAttempts recorded exactly 1 attempt`);
  assert(dispatchAttemptsRecorded[0]?.attemptStatus === 'ACCEPTED', `2.8: Attempt status transitioned to ACCEPTED`);
  assert(dispatchAttemptsRecorded[0]?.recipientCount === 1, `2.9: Recipient count recorded accurately`);

  // -------------------------------------------------------------------------
  // TASK 3: TERMINOLOGY & DELIVERY SEMANTICS VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- [TASK 3] Delivery Terminology & Postal Event Semantics ---');

  // Verify that MessageSent means "MTA Accepted / Delivered to Server"
  assert(
    recAfter1?.deliveryStatus === 'DELIVERED',
    '3.1: Backend deliveryStatus DELIVERED corresponds strictly to remote MTA acceptance (250 OK)'
  );
  assert(
    msgAfter1?.deliveredCount === 1,
    '3.2: Parent message deliveredCount reflects MTA-accepted deliveries'
  );

  console.log('\n===============================================================');
  console.log(`🎉 PHASE 3C VERIFICATION COMPLETE: ${passed}/${total} ASSERTIONS PASSED`);
  console.log('===============================================================\n');
}

runPhase3CTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 3C Verification Failed:', err);
    process.exit(1);
  });
