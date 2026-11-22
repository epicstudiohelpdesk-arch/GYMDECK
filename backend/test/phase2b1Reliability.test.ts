/**
 * Phase 2B.1 — Residual reliability hardening tests.
 *
 * PostgreSQL-backed. Postal is always replaced with an in-process stub, so no
 * real email is sent.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';

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
import { emailService } from '../services/email/emailService';
import { emailQuotaService } from '../services/email/quotaService';
import { postalClient } from '../services/email/postalClient';
import { postalWebhookService } from '../services/email/webhookService';
import {
  normalizeEmailAddress,
  addEmailSuppressionTx,
} from '../services/email/suppressionService';
import {
  processSingleJob,
  recoverExpiredLeases,
  renewWorkerLease,
} from '../services/email/deliveryWorker';

let providerCalls = 0;
let afterSendHook: (() => Promise<void>) | null = null;
const originalSendMessage = postalClient.sendMessage.bind(postalClient);

function installPostalStub(): void {
  postalClient.sendMessage = (async (params: any) => {
    providerCalls++;
    if (afterSendHook) await afterSendHook();
    const messages: Record<string, { id: number; token: string }> = {};
    for (const email of params.to as string[]) {
      messages[email] = {
        id: ++providerCalls,
        token: `tok_${providerCalls}`,
      };
    }
    return {
      status: 'success',
      time: 0.01,
      data: { message_id: `mock_${providerCalls}`, messages },
    } as any;
  }) as typeof postalClient.sendMessage;
}

const createdGymIds: string[] = [];

async function createGym(label: string): Promise<string> {
  const code = `p2b1-${label}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 32);
  const [gym] = await db.insert(gyms).values({ name: `Phase 2B1 ${label}`, code }).returning();
  assert.ok(gym);
  createdGymIds.push(gym.id);
  return gym.id;
}

async function enqueue(gymId: string, count: number, prefix = 'p2b1'): Promise<any> {
  return emailService.sendEmail(
    gymId,
    crypto.randomUUID(),
    {
      subject: 'Phase 2B.1 test',
      bodyHtml: '<p>test</p>',
      recipients: Array.from({ length: count }, () => ({
        email: `${prefix}_${crypto.randomUUID().slice(0, 8)}@example.com`,
      })),
    },
    { triggerWorker: false }
  );
}

async function claimJob(gymId: string, messageId: string, workerId: string, leaseMs = 300_000) {
  const now = new Date();
  const [job] = await db
    .update(emailOutbox)
    .set({
      jobStatus: 'PROCESSING',
      lockedAt: now,
      lockedBy: workerId,
      leaseExpiresAt: new Date(now.getTime() + leaseMs),
      lastHeartbeatAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(emailOutbox.gymId, gymId),
      eq(emailOutbox.emailMessageId, messageId),
      eq(emailOutbox.jobStatus, 'PENDING')
    ))
    .returning();
  return job;
}

async function usage(gymId: string) {
  const [row] = await db
    .select()
    .from(emailMonthlyUsage)
    .where(and(
      eq(emailMonthlyUsage.gymId, gymId),
      eq(emailMonthlyUsage.billingPeriod, emailQuotaService.getCurrentBillingPeriod())
    ))
    .limit(1);
  return row;
}

describe('PHASE 2B.1 — SUPPRESSION AND LEASE HARDENING', () => {
  before(async () => {
    await bootstrapDatabaseSchema();
    installPostalStub();
  });

  after(async () => {
    postalClient.sendMessage = originalSendMessage;
    await db.delete(emailSuppressions).where(sql`lower(${emailSuppressions.emailAddress}) like 'p2b1\\_%'`);
    for (const gymId of createdGymIds) {
      await db.delete(gyms).where(eq(gyms.id, gymId));
    }
    await closeDatabasePool();
  });

  describe('1. Suppression normalization', () => {
    it('1.1 normalizes trim and case', () => {
      assert.strictEqual(normalizeEmailAddress('  Mixed.Case@Example.COM '), 'mixed.case@example.com');
    });

    it('1.2 mixed-case legacy suppression blocks enqueue', async () => {
      const gymId = await createGym('suppress-enqueue');
      const blocked = `p2b1_Mixed_${crypto.randomUUID().slice(0, 8)}@Example.COM`;
      const allowed = `p2b1_Allowed_${crypto.randomUUID().slice(0, 8)}@example.com`;
      await db.insert(emailSuppressions).values({
        emailAddress: blocked,
        suppressionReason: 'ADMIN_MANUAL',
      });

      const message = await emailService.sendEmail(
        gymId,
        crypto.randomUUID(),
        {
          subject: 'mixed case suppression',
          bodyHtml: '<p>x</p>',
          recipients: [{ email: blocked.toLowerCase() }, { email: allowed }],
        },
        { triggerWorker: false }
      );

      assert.strictEqual(message.recipientCount, 1);
      const stored = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.deepStrictEqual(stored.map((r) => r.recipientEmail), [allowed.toLowerCase()]);
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 1);
    });

    it('1.3 mixed-case suppression blocks dispatch and releases quota', async () => {
      const gymId = await createGym('suppress-worker');
      const message = await enqueue(gymId, 2);
      const recipients = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      const blocked = recipients[0]!;
      await db.insert(emailSuppressions).values({
        emailAddress: blocked.recipientEmail.toUpperCase(),
        suppressionReason: 'COMPLAINT',
      });

      const job = await claimJob(gymId, message.id, 'p2b1_worker');
      assert.ok(job);
      await processSingleJob(job, 'p2b1_worker');

      const updated = await db.select().from(emailRecipients).where(eq(emailRecipients.emailMessageId, message.id));
      assert.strictEqual(updated.filter((r) => r.deliveryStatus === 'SUPPRESSED').length, 1);
      assert.strictEqual(updated.filter((r) => r.deliveryStatus === 'SENT').length, 1);
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 0);
      assert.strictEqual(row?.consumedCount, 1);
    });

    it('1.4 normalized duplicate suppression is stored once and preserves the existing row', async () => {
      const email = `p2b1_Dupe_${crypto.randomUUID().slice(0, 8)}@Example.COM`;
      await db.insert(emailSuppressions).values({
        emailAddress: email,
        suppressionReason: 'HARD_BOUNCE',
        source: 'LEGACY',
      });

      const inserted = await db.transaction(async (tx) =>
        addEmailSuppressionTx(tx, {
          gymId: null,
          emailAddress: email.toLowerCase(),
          suppressionReason: 'COMPLAINT',
          source: 'TEST',
        })
      );
      assert.strictEqual(inserted, false);

      const rows = await db
        .select()
        .from(emailSuppressions)
        .where(sql`lower(${emailSuppressions.emailAddress}) = ${email.toLowerCase()}`);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0]?.emailAddress, email);
      assert.strictEqual(rows[0]?.source, 'LEGACY');
    });

    it('1.5 webhook bounce stores lowercase suppression exactly once', async () => {
      const gymId = await createGym('suppress-webhook');
      const mixedEmail = `p2b1_Bounce_${crypto.randomUUID().slice(0, 8)}@Example.COM`;
      const providerMessageId = String(900000000 + Math.floor(Math.random() * 1000000));

      const [message] = await db
        .insert(emailMessages)
        .values({
          gymId,
          subject: 'Bounce normalization',
          bodyHtml: '<p>bounce</p>',
          fromAddress: 'notifications@example.com',
          recipientCount: 1,
          status: 'SENT',
        })
        .returning();
      assert.ok(message);

      await db.insert(emailRecipients).values({
        gymId,
        emailMessageId: message.id,
        recipientEmail: mixedEmail,
        deliveryStatus: 'SENT',
        providerMessageId,
        providerInstanceId: 'default',
      });

      const bounce = (uuid: string) => ({
        event: 'MessageBounced' as const,
        timestamp: Math.floor(Date.now() / 1000),
        uuid,
        payload: {
          message: { id: Number(providerMessageId), token: 'tok', to: mixedEmail, status: 'Bounced' },
          details: 'hard bounce',
        },
      });

      await postalWebhookService.handleWebhook(bounce(crypto.randomUUID()));
      await postalWebhookService.handleWebhook(bounce(crypto.randomUUID()));

      const rows = await db
        .select()
        .from(emailSuppressions)
        .where(sql`lower(${emailSuppressions.emailAddress}) = ${mixedEmail.toLowerCase()}`);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0]?.emailAddress, mixedEmail.toLowerCase());
    });

    it('1.6 a new normalized suppression cannot be duplicated by case', async () => {
      const email = `p2b1_New_${crypto.randomUUID().slice(0, 8)}@Example.com`;
      const first = await db.transaction(async (tx) =>
        addEmailSuppressionTx(tx, {
          gymId: null,
          emailAddress: ` ${email} `,
          suppressionReason: 'UNSUBSCRIBE',
          source: 'TEST',
        })
      );
      const second = await db.transaction(async (tx) =>
        addEmailSuppressionTx(tx, {
          gymId: null,
          emailAddress: email.toUpperCase(),
          suppressionReason: 'COMPLAINT',
          source: 'TEST',
        })
      );

      assert.strictEqual(first, true);
      assert.strictEqual(second, false);
      const rows = await db
        .select()
        .from(emailSuppressions)
        .where(sql`lower(${emailSuppressions.emailAddress}) = ${email.toLowerCase()}`);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0]?.emailAddress, email.toLowerCase());
    });
  });

  describe('2. Worker lease safety', () => {
    it('2.1 owner renews an unexpired lease and heartbeat', async () => {
      const gymId = await createGym('lease-renew');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_a');
      assert.ok(job);

      const before = job.leaseExpiresAt!.getTime();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const renewed = await renewWorkerLease(job.id, 'worker_a');
      assert.strictEqual(renewed, true);

      const [after] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, job.id));
      assert.ok(after!.leaseExpiresAt!.getTime() > before);
      assert.ok(after!.lastHeartbeatAt!.getTime() > job.lastHeartbeatAt!.getTime());
    });

    it('2.2 non-owner cannot renew or overwrite the active lease', async () => {
      const gymId = await createGym('lease-owner');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_a');
      assert.ok(job);
      const originalLease = job.leaseExpiresAt!.getTime();

      const renewed = await renewWorkerLease(job.id, 'worker_b');
      assert.strictEqual(renewed, false);

      const [after] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, job.id));
      assert.strictEqual(after!.lockedBy, 'worker_a');
      assert.strictEqual(after!.leaseExpiresAt!.getTime(), originalLease);
    });

    it('2.3 expired lease cannot be revived by the old worker', async () => {
      const gymId = await createGym('lease-expired');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_a', -60_000);
      assert.ok(job);

      const renewed = await renewWorkerLease(job.id, 'worker_a');
      assert.strictEqual(renewed, false);
    });

    it('2.4 stale worker cannot dispatch after another worker takes ownership', async () => {
      const gymId = await createGym('lease-stale');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_a');
      assert.ok(job);

      await db
        .update(emailOutbox)
        .set({
          lockedBy: 'worker_b',
          leaseExpiresAt: new Date(Date.now() + 300_000),
          lastHeartbeatAt: new Date(),
        })
        .where(eq(emailOutbox.id, job.id));

      const callsBefore = providerCalls;
      await processSingleJob(job, 'worker_a');
      assert.strictEqual(providerCalls, callsBefore, 'stale worker must not call the provider');

      const attempts = await db
        .select()
        .from(emailDispatchAttempts)
        .where(eq(emailDispatchAttempts.outboxId, job.id));
      assert.strictEqual(attempts.length, 0);
    });

    it('2.5 stale worker cannot commit acceptance after losing ownership mid-flight', async () => {
      const gymId = await createGym('lease-midflight');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_a');
      assert.ok(job);

      afterSendHook = async () => {
        await db
          .update(emailOutbox)
          .set({
            lockedBy: 'worker_b',
            leaseExpiresAt: new Date(Date.now() + 300_000),
            lastHeartbeatAt: new Date(),
          })
          .where(eq(emailOutbox.id, job.id));
      };

      try {
        await processSingleJob(job, 'worker_a');
      } finally {
        afterSendHook = null;
      }

      const [outbox] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, job.id));
      assert.strictEqual(outbox?.lockedBy, 'worker_b');
      const attempts = await db
        .select()
        .from(emailDispatchAttempts)
        .where(eq(emailDispatchAttempts.outboxId, job.id));
      assert.strictEqual(attempts.length, 1);
      assert.strictEqual(attempts[0]?.attemptStatus, 'DISPATCHING');
      const recipients = await db
        .select()
        .from(emailRecipients)
        .where(eq(emailRecipients.emailMessageId, message.id));
      assert.ok(recipients.every((r) => r.deliveryStatus === 'QUEUED'));
      const row = await usage(gymId);
      assert.strictEqual(row?.reservedCount, 1);
      assert.strictEqual(row?.consumedCount, 0);
    });

    it('2.6 recovery and renewal cannot leave a PENDING job with a live lease', async () => {
      const gymId = await createGym('lease-race');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_a', -1_000);
      assert.ok(job);

      const [renewed] = await Promise.all([
        renewWorkerLease(job.id, 'worker_a'),
        recoverExpiredLeases(),
      ]);

      const [after] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, job.id));
      if (renewed) {
        assert.strictEqual(after?.jobStatus, 'PROCESSING');
        assert.ok(after!.leaseExpiresAt!.getTime() > Date.now());
      } else {
        assert.strictEqual(after?.jobStatus, 'PENDING');
        assert.strictEqual(after?.leaseExpiresAt, null);
      }
    });

    it('2.7 expired recovery clears lock and lease transactionally', async () => {
      const gymId = await createGym('lease-recover');
      const message = await enqueue(gymId, 1);
      const job = await claimJob(gymId, message.id, 'worker_dead', -1_000);
      assert.ok(job);

      await recoverExpiredLeases();

      const [after] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, job.id));
      assert.strictEqual(after?.jobStatus, 'PENDING');
      assert.strictEqual(after?.lockedBy, null);
      assert.strictEqual(after?.leaseExpiresAt, null);
      assert.strictEqual(after?.lastHeartbeatAt, null);
    });
  });
});
