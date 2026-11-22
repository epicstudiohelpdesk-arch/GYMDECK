/**
 * Phase 2B — Email delivery correctness remediation tests.
 *
 * PostgreSQL-backed and deterministic: the Postal client is always replaced
 * with an in-process stub, so these tests never contact Postal or send email.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { eq, and } from 'drizzle-orm';

import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  emailMessages,
  emailRecipients,
  emailOutbox,
  emailDispatchAttempts,
  emailMonthlyUsage,
  emailSuppressions,
} from '../shared/database/schema';
import { config } from '../shared/config';
import { signJwt } from '../shared/security';
import { createApp } from '../gateway/src/app';
import { emailService } from '../services/email/emailService';
import { emailQuotaService } from '../services/email/quotaService';
import { postalClient, PostalApiError } from '../services/email/postalClient';
import {
  processSingleJob,
  recoverExpiredLeases,
} from '../services/email/deliveryWorker';

type SendMode = 'success' | 'partial' | 'clientRejected' | 'ambiguous' | 'connectionFailed';

let sendMode: SendMode = 'success';
let providerSequence = 700000000;
const originalSendMessage = postalClient.sendMessage.bind(postalClient);

function installPostalStub(): void {
  postalClient.sendMessage = (async (params: any) => {
    if (sendMode === 'clientRejected') {
      throw new PostalApiError('Invalid recipient', {
        httpStatus: 400,
        code: 'InvalidRecipient',
        category: 'CLIENT_REJECTED',
        isAmbiguous: false,
      });
    }
    if (sendMode === 'ambiguous') {
      throw new PostalApiError('Postal request timed out', {
        category: 'AMBIGUOUS_TIMEOUT',
        isAmbiguous: true,
      });
    }
    if (sendMode === 'connectionFailed') {
      throw new PostalApiError('Failed to connect to Postal', {
        category: 'CONNECTION_FAILED',
        isAmbiguous: false,
      });
    }

    const id = ++providerSequence;
    const messages: Record<string, { id: number; token: string }> = {};
    const recipientEmails: string[] = params.to;
    const accepted = sendMode === 'partial' ? recipientEmails.slice(0, -1) : recipientEmails;
    for (const email of accepted) {
      messages[email] = { id: ++providerSequence, token: `tok_${providerSequence}` };
    }

    return {
      status: 'success',
      time: 0.01,
      data: {
        message_id: sendMode === 'partial' ? undefined : `mock_${id}`,
        messages,
      },
    } as any;
  }) as typeof postalClient.sendMessage;
}

const createdGymIds: string[] = [];

async function createGym(label: string): Promise<string> {
  const code = `p2b-${label}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 32);
  const [gym] = await db.insert(gyms).values({ name: `Phase 2B ${label}`, code }).returning();
  assert.ok(gym);
  createdGymIds.push(gym.id);
  return gym.id;
}

function tokenFor(gymId: string, role: 'OWNER' | 'STAFF' = 'OWNER'): string {
  return signJwt(
    {
      sub: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      gymId,
      email: 'phase2b@example.com',
      role,
      permissions: role === 'STAFF' ? [] : undefined,
      jti: crypto.randomUUID(),
    },
    config.JWT_SECRET,
    3600
  );
}

function recipients(count: number): Array<{ email: string }> {
  return Array.from({ length: count }, (_, i) => ({ email: `p2b_${i}_${crypto.randomUUID().slice(0, 6)}@example.com` }));
}

async function send(gymId: string, count: number, key?: string): Promise<any> {
  return emailService.sendEmail(
    gymId,
    crypto.randomUUID(),
    {
      subject: 'Phase 2B test',
      bodyHtml: '<p>test</p>',
      recipients: recipients(count),
      idempotencyKey: key,
    },
    { triggerWorker: false }
  );
}

async function claimJob(gymId: string, messageId: string, expired = false) {
  const now = new Date();
  const lease = expired ? new Date(now.getTime() - 60_000) : new Date(now.getTime() + 300_000);
  const [job] = await db
    .update(emailOutbox)
    .set({
      jobStatus: 'PROCESSING',
      lockedAt: new Date(now.getTime() - 120_000),
      lockedBy: 'phase2b_test',
      leaseExpiresAt: lease,
      lastHeartbeatAt: new Date(now.getTime() - 120_000),
      updatedAt: now,
    })
    .where(and(eq(emailOutbox.gymId, gymId), eq(emailOutbox.emailMessageId, messageId), eq(emailOutbox.jobStatus, 'PENDING')))
    .returning();
  return job;
}

async function drainBatches(gymId: string, messageId: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const job = await claimJob(gymId, messageId);
    if (!job) break;
    await processSingleJob(job, 'phase2b_test');
  }
}

async function usage(gymId: string) {
  const [row] = await db
    .select()
    .from(emailMonthlyUsage)
    .where(and(eq(emailMonthlyUsage.gymId, gymId), eq(emailMonthlyUsage.billingPeriod, emailQuotaService.getCurrentBillingPeriod())))
    .limit(1);
  return row;
}

describe('PHASE 2B — EMAIL DELIVERY CORRECTNESS', () => {
  let server: Server;
  let baseUrl = '';

  before(async () => {
    await bootstrapDatabaseSchema();
    installPostalStub();

    const app = createApp();
    server = app.listen(0);
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    postalClient.sendMessage = originalSendMessage;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const gymId of createdGymIds) {
      await db.delete(gyms).where(eq(gyms.id, gymId));
    }
    await closeDatabasePool();
  });

  describe('1. Authentication and authorization', () => {
    it('1.1 rejects unauthenticated email API requests', async () => {
      const response = await fetch(`${baseUrl}/v1/owner/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'x', bodyHtml: '<p>x</p>', recipients: [{ email: 'x@example.com' }] }),
      });
      assert.strictEqual(response.status, 401);
    });

    it('1.2 rejects authenticated users without communications permission', async () => {
      const gymId = await createGym('auth-staff');
      const response = await fetch(`${baseUrl}/v1/owner/email/overview`, {
        headers: { Authorization: `Bearer ${tokenFor(gymId, 'STAFF')}` },
      });
      assert.strictEqual(response.status, 403);
    });

    it('1.3 accepts an authenticated owner and derives gym from the token', async () => {
      const gymId = await createGym('auth-owner');
      const response = await fetch(`${baseUrl}/v1/owner/email/overview`, {
        headers: { Authorization: `Bearer ${tokenFor(gymId)}` },
      });
      assert.strictEqual(response.status, 200);
    });

    it('1.4 prevents cross-tenant access to another gym message', async () => {
      const gymA = await createGym('tenant-a');
      const gymB = await createGym('tenant-b');
      const message = await send(gymB, 1, undefined);

      const response = await fetch(`${baseUrl}/v1/owner/email/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${tokenFor(gymA)}` },
      });
      assert.strictEqual(response.status, 404);
    });
  });

  describe('2. Quota lifecycle', () => {
    it('2.1 reserves quota atomically', async () => {
      const gymId = await createGym('quota-reserve');
      const status = await emailQuotaService.reserveQuota(gymId, 10);
      assert.strictEqual(status.reservedCount, 10);
      assert.strictEqual(status.remainingQuota, 290);
    });

    it('2.2 rolls back reservation when the transaction aborts', async () => {
      const gymId = await createGym('quota-rollback');
      await assert.rejects(
        db.transaction(async (tx) => {
          await emailQuotaService.reserveQuota(gymId, 7, tx);
          throw new Error('force rollback');
        }),
        /force rollback/
      );
      const rows = await db.select().from(emailMonthlyUsage).where(eq(emailMonthlyUsage.gymId, gymId));
      assert.strictEqual(rows.length, 0);
    });

    it('2.3 rolls back message, recipients and outbox when enqueue fails', async () => {
      const gymId = await createGym('enqueue-rollback');
      await assert.rejects(
        emailService.sendEmail(
          gymId,
          crypto.randomUUID(),
          {
            subject: 'rollback',
            bodyHtml: '<p>rollback</p>',
            recipients: [{ email: `rollback_${crypto.randomUUID()}@example.com`, memberId: crypto.randomUUID() }],
          },
          { triggerWorker: false }
        )
      );

      const rows = await db.select().from(emailMessages).where(eq(emailMessages.gymId, gymId));
      const usageRows = await db.select().from(emailMonthlyUsage).where(eq(emailMonthlyUsage.gymId, gymId));
      assert.strictEqual(rows.length, 0);
      assert.strictEqual(usageRows.length, 0);
    });

    it('2.4 replays a duplicate idempotency key without reserving twice', async () => {
      const gymId = await createGym('quota-idempotent');
      const key = crypto.randomUUID();
      const first = await send(gymId, 4, key);
      const second = await send(gymId, 4, key);

      assert.strictEqual(first.id, second.id);
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 4);
      const messages = await db.select().from(emailMessages).where(eq(emailMessages.gymId, gymId));
      assert.strictEqual(messages.length, 1);
    });

    it('2.5 serializes concurrent requests with the same idempotency key', async () => {
      const gymId = await createGym('quota-concurrent');
      const key = crypto.randomUUID();
      const [a, b] = await Promise.all([send(gymId, 5, key), send(gymId, 5, key)]);

      assert.strictEqual(a.id, b.id);
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 5);
      const messages = await db.select().from(emailMessages).where(eq(emailMessages.gymId, gymId));
      assert.strictEqual(messages.length, 1);
    });

    it('2.6 excludes suppressed recipients from reservation and delivery', async () => {
      const gymId = await createGym('quota-suppressed');
      const suppressedEmail = `suppressed_${crypto.randomUUID()}@example.com`;
      const deliverableEmail = `deliverable_${crypto.randomUUID()}@example.com`;
      await db.insert(emailSuppressions).values({
        emailAddress: suppressedEmail,
        suppressionReason: 'HARD_BOUNCE',
      });

      const message = await emailService.sendEmail(
        gymId,
        crypto.randomUUID(),
        {
          subject: 'suppression',
          bodyHtml: '<p>suppression</p>',
          recipients: [{ email: suppressedEmail }, { email: deliverableEmail }],
        },
        { triggerWorker: false }
      );

      assert.strictEqual(message.recipientCount, 1);
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 1);
      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.deepStrictEqual(stored.map((r) => r.recipientEmail), [deliverableEmail]);
    });

    it('2.7 releases reservation on permanent provider rejection', async () => {
      const gymId = await createGym('quota-rejected');
      const message = await send(gymId, 3);
      const job = await claimJob(gymId, message.id);
      assert.ok(job);

      sendMode = 'clientRejected';
      await processSingleJob(job, 'phase2b_test');
      sendMode = 'success';

      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 0);
      assert.strictEqual(row?.consumedCount, 0);
      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.ok(stored.every((r) => r.deliveryStatus === 'FAILED'));
      const [outbox] = await db.select().from(emailOutbox).where(eq(emailOutbox.emailMessageId, message.id));
      assert.strictEqual(outbox?.jobStatus, 'FAILED');
    });

    it('2.8 consumes quota only for recipients the provider accepted', async () => {
      const gymId = await createGym('quota-partial');
      const message = await send(gymId, 3);
      const job = await claimJob(gymId, message.id);
      assert.ok(job);

      sendMode = 'partial';
      await processSingleJob(job, 'phase2b_test');
      sendMode = 'success';

      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 0);
      assert.strictEqual(row?.consumedCount, 2);
      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.strictEqual(stored.filter((r) => r.deliveryStatus === 'SENT').length, 2);
      assert.strictEqual(stored.filter((r) => r.deliveryStatus === 'FAILED').length, 1);
    });

    it('2.9 releases quota when suppression happens after enqueue', async () => {
      const gymId = await createGym('quota-late-suppression');
      const message = await send(gymId, 2);
      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      const suppressed = stored[0]!;
      await db.insert(emailSuppressions).values({
        emailAddress: suppressed.recipientEmail,
        suppressionReason: 'COMPLAINT',
      });

      const job = await claimJob(gymId, message.id);
      assert.ok(job);
      await processSingleJob(job, 'phase2b_test');

      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 0);
      assert.strictEqual(row?.consumedCount, 1);
      const updated = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.strictEqual(updated.filter((r) => r.deliveryStatus === 'SUPPRESSED').length, 1);
      assert.strictEqual(updated.filter((r) => r.deliveryStatus === 'SENT').length, 1);
    });

    it('2.10 preserves the Asia/Kolkata month boundary', () => {
      assert.strictEqual(emailQuotaService.getCurrentBillingPeriod(new Date('2026-10-31T18:29:59Z')), '2026-10');
      assert.strictEqual(emailQuotaService.getCurrentBillingPeriod(new Date('2026-10-31T18:30:00Z')), '2026-11');
    });
  });

  describe('3. Multi-batch attempt numbering', () => {
    for (const count of [1, 25, 26, 50]) {
      it(`3.${count} dispatches ${count} recipients with unique monotonic attempts`, async () => {
        const gymId = await createGym(`batch-${count}`);
        const message = await send(gymId, count);
        await drainBatches(gymId, message.id);

        const attempts = await db
          .select()
          .from(emailDispatchAttempts)
          .where(eq(emailDispatchAttempts.emailMessageId, message.id));
        const expectedBatches = Math.ceil(count / (config.EMAIL_BATCH_SIZE || 25));

        assert.strictEqual(attempts.length, expectedBatches);
        assert.deepStrictEqual(
          attempts.map((a) => a.attemptNumber).sort((a, b) => a - b),
          Array.from({ length: expectedBatches }, (_, i) => i + 1)
        );

        const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
        assert.strictEqual(stored.filter((r) => r.deliveryStatus === 'SENT').length, count);

        const [msg] = await db.select().from(emailMessages).where(eq(emailMessages.id, message.id));
        assert.strictEqual(msg?.status, 'COMPLETED');
        const row = await usage(gymId);
        assert.strictEqual(row?.reservedCount, 0);
        assert.strictEqual(row?.consumedCount, count);
      });
    }

    it('3.retry uses a new attempt number and does not corrupt the batch', async () => {
      const gymId = await createGym('batch-retry');
      const message = await send(gymId, 2);

      const firstJob = await claimJob(gymId, message.id);
      assert.ok(firstJob);
      sendMode = 'connectionFailed';
      await processSingleJob(firstJob, 'phase2b_test');
      sendMode = 'success';

      const [afterFailure] = await db.select().from(emailOutbox).where(eq(emailOutbox.emailMessageId, message.id));
      assert.strictEqual(afterFailure?.jobStatus, 'PENDING');
      assert.strictEqual(afterFailure?.attempts, 1);

      await drainBatches(gymId, message.id);

      const attempts = await db
        .select()
        .from(emailDispatchAttempts)
        .where(eq(emailDispatchAttempts.emailMessageId, message.id));
      assert.deepStrictEqual(attempts.map((a) => a.attemptNumber).sort((a, b) => a - b), [1, 2]);
      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.ok(stored.every((r) => r.deliveryStatus === 'SENT'));
    });
  });

  describe('4. Crash recovery and duplicate-send prevention', () => {
    it('4.1 re-queues a crash before any dispatch attempt', async () => {
      const gymId = await createGym('recovery-before');
      const message = await send(gymId, 2);
      await claimJob(gymId, message.id, true);

      await recoverExpiredLeases();

      const [outbox] = await db.select().from(emailOutbox).where(eq(emailOutbox.emailMessageId, message.id));
      const attempts = await db.select().from(emailDispatchAttempts).where(eq(emailDispatchAttempts.emailMessageId, message.id));
      assert.strictEqual(outbox?.jobStatus, 'PENDING');
      assert.strictEqual(attempts.length, 0);
    });

    it('4.2 blocks automatic resend when dispatch was in flight', async () => {
      const gymId = await createGym('recovery-inflight');
      const message = await send(gymId, 2);
      const job = await claimJob(gymId, message.id, true);
      assert.ok(job);

      const [attempt] = await db
        .insert(emailDispatchAttempts)
        .values({
          gymId,
          emailMessageId: message.id,
          outboxId: job.id,
          attemptNumber: 1,
          attemptStatus: 'DISPATCHING',
          provider: 'POSTAL',
          recipientCount: 2,
          recipientBatchIds: (await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id))).map((r) => r.id),
          workerId: 'phase2b_test',
          requestStartedAt: new Date(Date.now() - 120_000),
          leaseExpiresAt: new Date(Date.now() - 60_000),
        })
        .returning();
      await db.update(emailOutbox).set({ currentAttemptId: attempt!.id }).where(eq(emailOutbox.id, job.id));

      await recoverExpiredLeases();

      const [outbox] = await db.select().from(emailOutbox).where(eq(emailOutbox.emailMessageId, message.id));
      const [updatedAttempt] = await db.select().from(emailDispatchAttempts).where(eq(emailDispatchAttempts.id, attempt!.id));
      assert.strictEqual(outbox?.jobStatus, 'RECONCILIATION_REQUIRED');
      assert.strictEqual(updatedAttempt?.attemptStatus, 'UNKNOWN_OUTCOME');
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 2);
      assert.strictEqual(row?.consumedCount, 0);
    });

    it('4.3 holds quota and does not retry an ambiguous timeout', async () => {
      const gymId = await createGym('recovery-ambiguous');
      const message = await send(gymId, 2);
      const job = await claimJob(gymId, message.id);
      assert.ok(job);

      sendMode = 'ambiguous';
      await processSingleJob(job, 'phase2b_test');
      sendMode = 'success';

      const [outbox] = await db.select().from(emailOutbox).where(eq(emailOutbox.emailMessageId, message.id));
      assert.strictEqual(outbox?.jobStatus, 'RECONCILIATION_REQUIRED');
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 2);
      assert.strictEqual(row?.consumedCount, 0);
    });

    it('4.4 applies an accepted attempt after a crash without calling Postal again', async () => {
      const gymId = await createGym('recovery-accepted');
      const message = await send(gymId, 2);
      const job = await claimJob(gymId, message.id, true);
      assert.ok(job);

      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      const providerId = '990001';
      const [attempt] = await db
        .insert(emailDispatchAttempts)
        .values({
          gymId,
          emailMessageId: message.id,
          outboxId: job.id,
          attemptNumber: 1,
          attemptStatus: 'ACCEPTED',
          provider: 'POSTAL',
          providerMessageId: providerId,
          recipientCount: 2,
          recipientBatchIds: stored.map((r) => r.id),
          workerId: 'phase2b_test',
          requestStartedAt: new Date(Date.now() - 120_000),
          requestCompletedAt: new Date(Date.now() - 110_000),
          leaseExpiresAt: new Date(Date.now() - 60_000),
          providerResponse: { messages: {} },
        })
        .returning();
      await db.update(emailOutbox).set({ currentAttemptId: attempt!.id }).where(eq(emailOutbox.id, job.id));

      const callsBefore = providerSequence;
      await recoverExpiredLeases();
      assert.strictEqual(providerSequence, callsBefore, 'recovery must not invoke the provider');

      const afterRows = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.ok(afterRows.every((r) => r.deliveryStatus === 'SENT' && r.providerMessageId === providerId));
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 0);
      assert.strictEqual(row?.consumedCount, 2);
      const [outbox] = await db.select().from(emailOutbox).where(eq(emailOutbox.emailMessageId, message.id));
      assert.strictEqual(outbox?.jobStatus, 'COMPLETED');

      await recoverExpiredLeases();
      const finalRows = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.ok(finalRows.every((r) => r.attempts === 1));
    });

    it('4.5 concurrent recovery workers cannot double-consume quota', async () => {
      const gymId = await createGym('recovery-concurrent');
      const message = await send(gymId, 2);
      const job = await claimJob(gymId, message.id, true);
      assert.ok(job);

      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      const [attempt] = await db
        .insert(emailDispatchAttempts)
        .values({
          gymId,
          emailMessageId: message.id,
          outboxId: job.id,
          attemptNumber: 1,
          attemptStatus: 'ACCEPTED',
          provider: 'POSTAL',
          providerMessageId: '990002',
          recipientCount: 2,
          recipientBatchIds: stored.map((r) => r.id),
          workerId: 'phase2b_test',
          requestStartedAt: new Date(Date.now() - 120_000),
          requestCompletedAt: new Date(Date.now() - 110_000),
          leaseExpiresAt: new Date(Date.now() - 60_000),
          providerResponse: { messages: {} },
        })
        .returning();
      await db.update(emailOutbox).set({ currentAttemptId: attempt!.id }).where(eq(emailOutbox.id, job.id));

      await Promise.all([recoverExpiredLeases(), recoverExpiredLeases()]);

      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 0);
      assert.strictEqual(row?.consumedCount, 2);
      const finalRows = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.ok(finalRows.every((r) => r.attempts === 1));
    });
  });
});
