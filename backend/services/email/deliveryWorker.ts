/**
 * GymDeck Email Delivery Worker
 *
 * Durable background queue consumer:
 *  - Locks pending email_outbox jobs
 *  - Resolves batch recipients
 *  - Enforces suppression lists (bounces / opt-outs)
 *  - Performs Postal submission
 *  - Updates recipient statuses and commits quota atomically
 *
 * Delivery is at-most-once after provider acceptance: an ACCEPTED attempt is
 * never reset to PENDING. Recovery applies the durable recipient batch instead
 * of calling the provider again.
 */

import { eq, and, sql, lte, inArray, lt, gt } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  emailOutbox,
  emailMessages,
  emailRecipients,
  emailDispatchAttempts,
} from '../../shared/database/schema';
import { providerRouter } from './providerRouter';
import { emailQuotaService } from './quotaService';
import { findSuppressedEmails } from './suppressionService';
import { logger } from '../../shared/logging';
import { config } from '../../shared/config';

let workerTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

// 5 minutes lease duration for background jobs
const WORKER_LEASE_MS = 5 * 60 * 1000;
// Renew well before expiry; completed batches are short, but a provider call or
// database stall must not let a live worker lose ownership.
const LEASE_RENEW_INTERVAL_MS = Math.max(1000, Math.floor(WORKER_LEASE_MS / 3));

type RecipientRow = typeof emailRecipients.$inferSelect;
type DispatchAttemptRow = typeof emailDispatchAttempts.$inferSelect;

class LeaseOwnershipLostError extends Error {
  constructor(jobId: string) {
    super(`Lease ownership lost for outbox job ${jobId}`);
    this.name = 'LeaseOwnershipLostError';
  }
}

function billingPeriodFor(message: { createdAt: Date }): string {
  return emailQuotaService.getCurrentBillingPeriod(message.createdAt);
}

/**
 * Renew a worker's lease only while it still owns an unexpired PROCESSING job.
 * The ownership and expiry predicates ensure a stale worker can never revive
 * or overwrite another worker's lease.
 */
export async function renewWorkerLease(jobId: string, workerId: string): Promise<boolean> {
  const now = new Date();
  const leaseExpires = new Date(now.getTime() + WORKER_LEASE_MS);

  return db.transaction(async (tx) => {
    const renewed = await tx
      .update(emailOutbox)
      .set({
        leaseExpiresAt: leaseExpires,
        lastHeartbeatAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(emailOutbox.id, jobId),
          eq(emailOutbox.jobStatus, 'PROCESSING'),
          eq(emailOutbox.lockedBy, workerId),
          gt(emailOutbox.leaseExpiresAt, now)
        )
      )
      .returning({ currentAttemptId: emailOutbox.currentAttemptId });

    if (renewed.length === 0) return false;

    const currentAttemptId = renewed[0]?.currentAttemptId;
    if (currentAttemptId) {
      await tx
        .update(emailDispatchAttempts)
        .set({
          leaseExpiresAt: leaseExpires,
          lastHeartbeatAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(emailDispatchAttempts.id, currentAttemptId),
            eq(emailDispatchAttempts.workerId, workerId),
            eq(emailDispatchAttempts.attemptStatus, 'DISPATCHING')
          )
        );
    }

    return true;
  });
}

/**
 * Lock and verify ownership inside a state-changing transaction. A worker that
 * lost its lease must not write acceptance, failure or retry state.
 */
async function assertJobOwnership(
  tx: any,
  jobId: string,
  workerId: string,
  now: Date
): Promise<void> {
  const owned = await tx
    .select({ id: emailOutbox.id })
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.id, jobId),
        eq(emailOutbox.jobStatus, 'PROCESSING'),
        eq(emailOutbox.lockedBy, workerId),
        gt(emailOutbox.leaseExpiresAt, now)
      )
    )
    .for('update')
    .limit(1);

  if (owned.length === 0) throw new LeaseOwnershipLostError(jobId);
}

/**
 * Finish a batch: complete the message when nothing is queued, otherwise
 * release the outbox for the next batch. Runs on the caller's transaction.
 */
async function finalizeJob(
  tx: any,
  jobId: string,
  messageId: string,
  gymId: string,
  now: Date
): Promise<void> {
  const remainingRows = await tx
    .select({ count: sql<number>`count(*)` })
    .from(emailRecipients)
    .where(
      and(
        eq(emailRecipients.emailMessageId, messageId),
        eq(emailRecipients.gymId, gymId),
        eq(emailRecipients.deliveryStatus, 'QUEUED')
      )
    );

  const remaining = Number(remainingRows[0]?.count || 0);

  if (remaining === 0) {
    await tx
      .update(emailMessages)
      .set({ status: 'COMPLETED', completedAt: now, updatedAt: now })
      .where(and(eq(emailMessages.id, messageId), eq(emailMessages.gymId, gymId)));

    await tx
      .update(emailOutbox)
      .set({
        jobStatus: 'COMPLETED',
        completedAt: now,
        updatedAt: now,
        currentAttemptId: null,
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
        lastHeartbeatAt: null,
        lastError: null,
      })
      .where(eq(emailOutbox.id, jobId));
    return;
  }

  // More recipients remain: make the next batch immediately claimable.
  await tx
    .update(emailOutbox)
    .set({
      jobStatus: 'PENDING',
      nextAttemptAt: now,
      updatedAt: now,
      currentAttemptId: null,
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      lastHeartbeatAt: null,
      lastError: null,
    })
    .where(eq(emailOutbox.id, jobId));
}

/**
 * Permanently fail a job, mark only still-queued batch recipients FAILED and
 * release their reserved quota. Runs on the caller's transaction.
 */
async function failQueuedBatch(
  tx: any,
  jobId: string,
  messageId: string,
  gymId: string,
  recipientIds: string[],
  billingPeriod: string,
  reason: string,
  now: Date,
  ownerWorkerId?: string
): Promise<number> {
  let failedCount = 0;

  if (ownerWorkerId) {
    const owned = await tx
      .select({ id: emailOutbox.id })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.id, jobId),
          eq(emailOutbox.jobStatus, 'PROCESSING'),
          eq(emailOutbox.lockedBy, ownerWorkerId)
        )
      )
      .for('update')
      .limit(1);

    if (owned.length === 0) return 0;
  }

  if (recipientIds.length > 0) {
    const queued = await tx
      .select({ id: emailRecipients.id })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.gymId, gymId),
          eq(emailRecipients.emailMessageId, messageId),
          inArray(emailRecipients.id, recipientIds),
          eq(emailRecipients.deliveryStatus, 'QUEUED')
        )
      )
      .for('update');

    failedCount = queued.length;

    if (failedCount > 0) {
      await tx
        .update(emailRecipients)
        .set({
          deliveryStatus: 'FAILED',
          failureReason: reason,
          updatedAt: now,
        })
        .where(
          and(
            eq(emailRecipients.gymId, gymId),
            inArray(
              emailRecipients.id,
              queued.map((row: { id: string }) => row.id)
            ),
            eq(emailRecipients.deliveryStatus, 'QUEUED')
          )
        );

      await emailQuotaService.releaseReservedQuota(gymId, billingPeriod, failedCount, tx);
    }
  }

  await tx
    .update(emailMessages)
    .set({ status: 'FAILED', updatedAt: now })
    .where(and(eq(emailMessages.id, messageId), eq(emailMessages.gymId, gymId)));

  const outboxWhere = ownerWorkerId
    ? and(
        eq(emailOutbox.id, jobId),
        eq(emailOutbox.jobStatus, 'PROCESSING'),
        eq(emailOutbox.lockedBy, ownerWorkerId)
      )
    : eq(emailOutbox.id, jobId);

  await tx
    .update(emailOutbox)
    .set({
      jobStatus: 'FAILED',
      lastError: reason,
      completedAt: now,
      updatedAt: now,
      currentAttemptId: null,
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      lastHeartbeatAt: null,
    })
    .where(outboxWhere);

  return failedCount;
}

/**
 * Apply a provider-accepted attempt to recipients and quota exactly once.
 * The recipient rows are locked FOR UPDATE; a concurrent recovery worker sees
 * them as no longer QUEUED and therefore cannot commit quota twice.
 */
async function applyAcceptedAttempt(
  tx: any,
  job: any,
  attempt: DispatchAttemptRow,
  now: Date
): Promise<void> {
  const messageRows = await tx
    .select()
    .from(emailMessages)
    .where(and(eq(emailMessages.id, job.emailMessageId), eq(emailMessages.gymId, job.gymId)))
    .limit(1);
  const message = messageRows[0];
  if (!message) return;

  const recipientIds = Array.isArray(attempt.recipientBatchIds)
    ? (attempt.recipientBatchIds as string[])
    : [];

  let queued: RecipientRow[] = [];
  if (recipientIds.length > 0) {
    queued = await tx
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.gymId, job.gymId),
          eq(emailRecipients.emailMessageId, job.emailMessageId),
          inArray(emailRecipients.id, recipientIds),
          eq(emailRecipients.deliveryStatus, 'QUEUED')
        )
      )
      .for('update');
  }

  if (queued.length > 0) {
    const providerMessages = (attempt.providerResponse as any)?.messages || {};

    for (const rec of queued) {
      const pMsg = providerMessages[rec.recipientEmail];
      await tx
        .update(emailRecipients)
        .set({
          deliveryStatus: 'SENT',
          providerMessageId: pMsg
            ? String(pMsg.id)
            : attempt.providerMessageId || rec.providerMessageId,
          providerToken: pMsg?.token || rec.providerToken,
          attempts: rec.attempts + 1,
          lastAttemptAt: attempt.requestCompletedAt || now,
          updatedAt: now,
        })
        .where(
          and(
            eq(emailRecipients.id, rec.id),
            eq(emailRecipients.deliveryStatus, 'QUEUED')
          )
        );
    }

    await emailQuotaService.commitQuota(
      job.gymId,
      billingPeriodFor(message),
      queued.length,
      queued.length,
      tx
    );
  }

  await tx
    .update(emailDispatchAttempts)
    .set({
      reconciliationNotes:
        'Provider acceptance was recorded before recipient state was applied. Recipients were applied from the durable batch during lease recovery; no provider resend occurred.',
      updatedAt: now,
    })
    .where(eq(emailDispatchAttempts.id, attempt.id));

  await finalizeJob(tx, job.id, job.emailMessageId, job.gymId, now);

  logger.warn('[emailWorker] Applied ACCEPTED attempt after lease expiry without resending', {
    jobId: job.id,
    attemptId: attempt.id,
  });
}

/**
 * Sweep for expired worker leases (zombie jobs).
 *  - Crash before any attempt: reset to PENDING (safe).
 *  - Crash with DISPATCHING attempt: reconciliation (outcome unknown).
 *  - Crash after ACCEPTED: apply the durable batch, never resend.
 */
export async function recoverExpiredLeases(): Promise<number> {
  const now = new Date();

  const candidates = await db
    .select({ id: emailOutbox.id })
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.jobStatus, 'PROCESSING'),
        lt(emailOutbox.leaseExpiresAt, now)
      )
    );

  let recoveredCount = 0;

  for (const candidate of candidates) {
    // Re-read under a row lock. A heartbeat that renewed the lease after the
    // candidate query must win; recovery must never clobber a live owner.
    const recovered = await db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(emailOutbox)
        .where(
          and(
            eq(emailOutbox.id, candidate.id),
            eq(emailOutbox.jobStatus, 'PROCESSING'),
            lt(emailOutbox.leaseExpiresAt, now)
          )
        )
        .for('update')
        .limit(1);

      if (!job) return false;

      if (job.currentAttemptId) {
        const [attempt] = await tx
          .select()
          .from(emailDispatchAttempts)
          .where(eq(emailDispatchAttempts.id, job.currentAttemptId))
          .limit(1);

        if (attempt?.attemptStatus === 'ACCEPTED') {
          await applyAcceptedAttempt(tx, job, attempt, now);
          return true;
        }

        if (
          attempt &&
          (attempt.attemptStatus === 'DISPATCHING' ||
            attempt.attemptStatus === 'UNKNOWN_OUTCOME' ||
            attempt.attemptStatus === 'RECONCILIATION_REQUIRED')
        ) {
          // Provider may have accepted before the crash. A retry could duplicate.
          logger.error('[emailWorker] Zombie lease recovery: dispatch outcome unresolved. Flagging RECONCILIATION_REQUIRED', {
            jobId: job.id,
            attemptId: attempt.id,
            attemptStatus: attempt.attemptStatus,
          });

          if (attempt.attemptStatus === 'DISPATCHING') {
            await tx
              .update(emailDispatchAttempts)
              .set({
                attemptStatus: 'UNKNOWN_OUTCOME',
                reconciliationNotes:
                  'Worker crashed or lease expired while dispatch was in-flight. Manual reconciliation or Postal status probe required.',
                updatedAt: now,
              })
              .where(eq(emailDispatchAttempts.id, attempt.id));
          }

          await tx
            .update(emailOutbox)
            .set({
              jobStatus: 'RECONCILIATION_REQUIRED',
              lastError:
                'Worker crashed during dispatch attempt. Outcome unknown; automatic retry prohibited.',
              updatedAt: now,
              leaseExpiresAt: null,
              lastHeartbeatAt: null,
            })
            .where(eq(emailOutbox.id, job.id));

          return true;
        }

        if (
          attempt &&
          (attempt.attemptStatus === 'REJECTED' ||
            attempt.attemptStatus === 'FAILED_PERMANENT')
        ) {
          const [message] = await tx
            .select()
            .from(emailMessages)
            .where(eq(emailMessages.id, job.emailMessageId))
            .limit(1);

          if (message) {
            const ids = Array.isArray(attempt.recipientBatchIds)
              ? (attempt.recipientBatchIds as string[])
              : [];
            await failQueuedBatch(
              tx,
              job.id,
              job.emailMessageId,
              job.gymId,
              ids,
              billingPeriodFor(message),
              'Provider permanently rejected the batch and the worker lease expired before cleanup.',
              now
            );
            return true;
          }
        }
      }

      // No attempt was created (or it has no provider outcome): safe to re-queue.
      logger.warn('[emailWorker] Zombie lease recovery: resetting un-dispatched job to PENDING', {
        jobId: job.id,
      });

      await tx
        .update(emailOutbox)
        .set({
          jobStatus: 'PENDING',
          lockedAt: null,
          lockedBy: null,
          leaseExpiresAt: null,
          lastHeartbeatAt: null,
          currentAttemptId: null,
          updatedAt: now,
        })
        .where(eq(emailOutbox.id, job.id));

      return true;
    });

    if (recovered) recoveredCount++;
  }

  return recoveredCount;
}

export async function processOutboxJobs(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    await recoverExpiredLeases();

    const now = new Date();
    const leaseExpires = new Date(now.getTime() + WORKER_LEASE_MS);
    const workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 6)}`;

    const pendingJobs = await db
      .update(emailOutbox)
      .set({
        jobStatus: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        leaseExpiresAt: leaseExpires,
        lastHeartbeatAt: now,
        updatedAt: now,
      })
      .where(
        and(
          inArray(emailOutbox.jobStatus, ['PENDING']),
          lte(emailOutbox.nextAttemptAt, now)
        )
      )
      .returning();

    for (const job of pendingJobs) {
      await processSingleJob(job, workerId);
    }
  } catch (err: any) {
    logger.error('[emailWorker] Error during outbox sweep', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    isProcessing = false;
  }
}

export async function processSingleJob(job: any, workerId?: string): Promise<void> {
  const { id: jobId, gymId, emailMessageId } = job;
  const activeWorkerId = workerId || job.lockedBy || `worker_${process.pid}`;

  let batchRecipients: RecipientRow[] = [];
  let billingPeriod = emailQuotaService.getCurrentBillingPeriod();
  let leaseLost = false;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  // Refuse to act unless this worker owns an unexpired PROCESSING lease.
  const initialOwnership = await db
    .select({ id: emailOutbox.id })
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.id, jobId),
        eq(emailOutbox.jobStatus, 'PROCESSING'),
        eq(emailOutbox.lockedBy, activeWorkerId),
        gt(emailOutbox.leaseExpiresAt, new Date())
      )
    )
    .limit(1);

  if (initialOwnership.length === 0) {
    logger.warn('[emailWorker] Refusing to process job without an active owned lease', {
      jobId,
      workerId: activeWorkerId,
    });
    return;
  }

  heartbeatTimer = setInterval(() => {
    void renewWorkerLease(jobId, activeWorkerId)
      .then((renewed) => {
        if (!renewed) {
          leaseLost = true;
          logger.warn('[emailWorker] Lease lost during processing; worker will not commit state', {
            jobId,
            workerId: activeWorkerId,
          });
        }
      })
      .catch((err) => {
        logger.warn('[emailWorker] Lease heartbeat failed; retaining current lease until expiry', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, LEASE_RENEW_INTERVAL_MS);
  heartbeatTimer.unref();

  try {
    // 1. Load message
    const msgRows = await db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.id, emailMessageId), eq(emailMessages.gymId, gymId)))
      .limit(1);

    if (msgRows.length === 0) {
      await db
        .update(emailOutbox)
        .set({ jobStatus: 'FAILED', lastError: 'Parent email message not found', completedAt: new Date() })
        .where(and(eq(emailOutbox.id, jobId), eq(emailOutbox.lockedBy, activeWorkerId)));
      return;
    }

    const message = msgRows[0];
    if (!message) return;

    billingPeriod = billingPeriodFor(message);

    // 2. Fetch pending recipients for this message
    const recipients = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.emailMessageId, emailMessageId),
          eq(emailRecipients.gymId, gymId),
          eq(emailRecipients.deliveryStatus, 'QUEUED')
        )
      )
      .limit(config.EMAIL_BATCH_SIZE || 25);

    if (recipients.length === 0) {
      await db.transaction(async (tx) => {
        await assertJobOwnership(tx, jobId, activeWorkerId, new Date());
        await finalizeJob(tx, jobId, emailMessageId, gymId, new Date());
      });
      return;
    }

    // 3. Check suppressions (re-check at dispatch time)
    const suppressedSet = await findSuppressedEmails(
      db,
      recipients.map((r) => r.recipientEmail)
    );

    const activeRecipients = recipients.filter(
      (r) => !suppressedSet.has(r.recipientEmail.toLowerCase())
    );
    const skippedRecipients = recipients.filter((r) =>
      suppressedSet.has(r.recipientEmail.toLowerCase())
    );

    // Mark suppressed and release their quota in one transaction. If this
    // commits and the worker crashes, the recipients are no longer QUEUED, so
    // the release cannot run twice.
    if (skippedRecipients.length > 0) {
      await db.transaction(async (tx) => {
        await assertJobOwnership(tx, jobId, activeWorkerId, new Date());
        await tx
          .update(emailRecipients)
          .set({
            deliveryStatus: 'SUPPRESSED',
            failureReason: 'Address suppressed due to previous bounce or opt-out',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(emailRecipients.gymId, gymId),
              inArray(
                emailRecipients.id,
                skippedRecipients.map((r) => r.id)
              ),
              eq(emailRecipients.deliveryStatus, 'QUEUED')
            )
          );

        await emailQuotaService.releaseReservedQuota(gymId, billingPeriod, skippedRecipients.length, tx);
      });
    }

    batchRecipients = activeRecipients;

    if (activeRecipients.length > 0) {
      const attemptStartTime = new Date();
      const leaseExpires = new Date(attemptStartTime.getTime() + WORKER_LEASE_MS);

      // 4A. Allocate a monotonic attempt number per outbox and durably record
      // DISPATCHING before the provider call. MAX+1 respects the existing
      // unique (outbox_id, attempt_number) index across batches and retries.
      const dispatchAttempt = await db.transaction(async (tx) => {
        await assertJobOwnership(tx, jobId, activeWorkerId, attemptStartTime);

        const maxRows = await tx
          .select({
            maxAttempt: sql<number>`coalesce(max(${emailDispatchAttempts.attemptNumber}), 0)`,
          })
          .from(emailDispatchAttempts)
          .where(eq(emailDispatchAttempts.outboxId, jobId));

        const attemptNumber = Number(maxRows[0]?.maxAttempt || 0) + 1;

        const inserted = await tx
          .insert(emailDispatchAttempts)
          .values({
            gymId,
            emailMessageId,
            outboxId: jobId,
            attemptNumber,
            attemptStatus: 'DISPATCHING',
            provider: config.EMAIL_DELIVERY_PROVIDER === 'brevo' ? 'BREVO' : 'POSTAL',
            recipientCount: activeRecipients.length,
            recipientBatchIds: activeRecipients.map((r) => r.id),
            workerId: activeWorkerId,
            requestStartedAt: attemptStartTime,
            leaseExpiresAt: leaseExpires,
            lastHeartbeatAt: attemptStartTime,
          })
          .returning();

        const attempt = inserted[0];
        if (!attempt) throw new Error('Failed to create dispatch attempt.');

        await tx
          .update(emailOutbox)
          .set({
            currentAttemptId: attempt.id,
            leaseExpiresAt: leaseExpires,
            lastHeartbeatAt: attemptStartTime,
            updatedAt: attemptStartTime,
          })
          .where(eq(emailOutbox.id, jobId));

        return attempt;
      });

      // 4B. Submit to Postal only while still holding the owned lease.
      if (leaseLost || !(await renewWorkerLease(jobId, activeWorkerId))) {
        throw new LeaseOwnershipLostError(jobId);
      }

      // 4B. Dispatch through the provider router (Brevo or Postal), keyed by
      // the snapshot provider recorded on the dispatch attempt.
      type DeliverySendInput = {
        gymId: string;
        emailMessageId: string;
        to: string[];
        htmlContent: string;
        textContent?: string;
        senderName?: string;
        senderEmail?: string;
        batchIndex: number;
        recipientBatchIds: string[];
      };
      const dispatchInput: DeliverySendInput = {
        gymId,
        emailMessageId,
        to: activeRecipients.map((r) => r.recipientEmail),
        htmlContent: message.bodyHtml,
        textContent: message.bodyText || undefined,
        senderName: message.senderDisplayName || 'GymDeck',
        senderEmail: message.fromAddress,
        batchIndex: dispatchAttempt.attemptNumber - 1,
        recipientBatchIds: activeRecipients.map((r) => r.id),
      };

      let sendResult: any;
      try {
        const dispatchResult = await providerRouter.dispatch(dispatchInput);
        if (!dispatchResult.ok) {
          throw new Error(`Provider dispatch failed: ${JSON.stringify(dispatchResult.result)}`);
        }
        sendResult = dispatchResult.result;
      } catch (providerErr: any) {
        if (leaseLost || !(await renewWorkerLease(jobId, activeWorkerId))) {
          throw new LeaseOwnershipLostError(jobId);
        }

        const errorMsg = providerErr instanceof Error ? providerErr.message : String(providerErr);
        let attemptStatus: 'UNKNOWN_OUTCOME' | 'REJECTED' | 'FAILED' = 'UNKNOWN_OUTCOME';
        let category = 'AMBIGUOUS_TIMEOUT';
        let httpStatus: number | null = null;
        let errorCode: string | null = null;

        if (providerErr && typeof providerErr === 'object') {
          if ('isAmbiguous' in providerErr && Boolean((providerErr as any)?.isAmbiguous)) {
            attemptStatus = 'UNKNOWN_OUTCOME';
            category = (providerErr as any).category || 'AMBIGUOUS_TIMEOUT';
            httpStatus = (providerErr as any)?.httpStatus || null;
            errorCode = (providerErr as any)?.code || null;
          } else if ('category' in providerErr && Boolean((providerErr as any)?.category)) {
            attemptStatus = (providerErr as any).category === 'CLIENT_REJECTED' || (providerErr as any).category === 'AUTH_FAILED'
              ? 'REJECTED'
              : 'FAILED';
            category = (providerErr as any).category;
            httpStatus = (providerErr as any)?.httpStatus || null;
            errorCode = (providerErr as any)?.code || null;
          } else {
            attemptStatus = 'FAILED';
          }
        } else {
          attemptStatus = 'FAILED';
        }

        await db
          .update(emailDispatchAttempts)
          .set({
            attemptStatus,
            httpStatus: httpStatus || null,
            errorCode: errorCode || category,
            errorMessage: errorMsg,
            requestCompletedAt: new Date(),
            updatedAt: new Date(),
            reconciliationNotes: (providerErr as any)?.isAmbiguous
              ? 'Network timeout or ambiguous provider state. Blind retry blocked.'
              : undefined,
          })
          .where(
            and(
              eq(emailDispatchAttempts.id, dispatchAttempt.id),
              eq(emailDispatchAttempts.workerId, activeWorkerId)
            )
          );

        throw providerErr;
      }

      const providerData = sendResult.data;
      const providerMessages = providerData?.messages || {};
      const completedTime = new Date();

      // 4C. Persist acceptance, recipient state and quota in one transaction.
      // A crash cannot leave ACCEPTED persisted without the batch application.
      if (leaseLost || !(await renewWorkerLease(jobId, activeWorkerId))) {
        throw new LeaseOwnershipLostError(jobId);
      }

      await db.transaction(async (tx) => {
        await assertJobOwnership(tx, jobId, activeWorkerId, completedTime);

        await tx
          .update(emailDispatchAttempts)
          .set({
            attemptStatus: 'ACCEPTED',
            providerMessageId: providerData?.message_id ? String(providerData.message_id) : null,
            httpStatus: 200,
            providerResponse: providerData,
            requestCompletedAt: completedTime,
            updatedAt: completedTime,
          })            .where(
              and(
                eq(emailDispatchAttempts.id, dispatchAttempt.id),
                eq(emailDispatchAttempts.workerId, activeWorkerId),
                eq(emailDispatchAttempts.attemptStatus, 'DISPATCHING')
              )
            );

        const acceptedRecipients: RecipientRow[] = [];
        const rejectedRecipients: RecipientRow[] = [];

        for (const rec of activeRecipients) {
          const pMsg = providerMessages[rec.recipientEmail];
          if (pMsg || providerData?.message_id) {
            acceptedRecipients.push(rec);
            await tx
              .update(emailRecipients)
              .set({
                deliveryStatus: 'SENT',
                providerMessageId: pMsg
                  ? String(pMsg.id)
                  : providerData?.message_id
                    ? String(providerData.message_id)
                    : undefined,
                providerToken: pMsg ? pMsg.token : undefined,
                attempts: rec.attempts + 1,
                lastAttemptAt: completedTime,
                updatedAt: completedTime,
              })
              .where(
                and(
                  eq(emailRecipients.id, rec.id),
                  eq(emailRecipients.deliveryStatus, 'QUEUED')
                )
              );
          } else {
            rejectedRecipients.push(rec);
          }
        }

        if (rejectedRecipients.length > 0) {
          await tx
            .update(emailRecipients)
            .set({
              deliveryStatus: 'FAILED',
              failureReason: 'Provider accepted the request but returned no recipient record.',
              updatedAt: completedTime,
            })
            .where(
              and(
                eq(emailRecipients.gymId, gymId),
                inArray(
                  emailRecipients.id,
                  rejectedRecipients.map((r) => r.id)
                ),
                eq(emailRecipients.deliveryStatus, 'QUEUED')
              )
            );
        }

        // Subtract the full reserved batch and consume only confirmed accepts.
        await emailQuotaService.commitQuota(
          gymId,
          billingPeriod,
          acceptedRecipients.length,
          activeRecipients.length,
          tx
        );

        await tx
          .update(emailMessages)
          .set({ status: 'SENDING', updatedAt: completedTime })
          .where(eq(emailMessages.id, emailMessageId));

        await finalizeJob(tx, jobId, emailMessageId, gymId, completedTime);
      });
    } else {
      // Only suppressed recipients were in this slice; quota was released above.
      await db.transaction(async (tx) => {
        await assertJobOwnership(tx, jobId, activeWorkerId, new Date());
        await finalizeJob(tx, jobId, emailMessageId, gymId, new Date());
      });
    }
  } catch (err: any) {
    if (err instanceof LeaseOwnershipLostError || leaseLost) {
      logger.warn('[emailWorker] Lease ownership lost; no state was committed by this worker', {
        jobId,
        workerId: activeWorkerId,
      });
      return;
    }

    if (!(await renewWorkerLease(jobId, activeWorkerId))) {
      logger.warn('[emailWorker] Lease could not be renewed after error; no state was committed', {
        jobId,
        workerId: activeWorkerId,
      });
      return;
    }

    let errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn('[emailWorker] Delivery error for outbox job', { jobId, error: errorMsg });
    let isAmbiguous = false;
    let category = 'AMBIGUOUS_TIMEOUT';
    let retryAfterSeconds: number | undefined = undefined;

    if (err && typeof err === 'object' && 'isAmbiguous' in err) {
      isAmbiguous = Boolean((err as any)?.isAmbiguous);
      category = (err as any).category || 'AMBIGUOUS_TIMEOUT';
      retryAfterSeconds = (err as any)?.retryAfterSeconds;
    }

    // Ambiguous outcome: keep the reservation and attempt for reconciliation.
    if (isAmbiguous) {
      await db
        .update(emailOutbox)
        .set({
          jobStatus: 'RECONCILIATION_REQUIRED',
          lastError: `Ambiguous dispatch outcome: ${errorMsg}. Automated retry blocked to prevent duplicate send.`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailOutbox.id, jobId),
            eq(emailOutbox.jobStatus, 'PROCESSING'),
            eq(emailOutbox.lockedBy, activeWorkerId)
          )
        );
      return;
    }

    // Permanent rejection/auth failure before acceptance: release the batch.
    if (category === 'CLIENT_REJECTED' || category === 'AUTH_FAILED') {
      await db.transaction(async (tx) => {
        await failQueuedBatch(
          tx,
          jobId,
          emailMessageId,
          gymId,
          batchRecipients.map((r) => r.id),
          billingPeriod,
          `Permanent provider rejection: ${errorMsg}`,
          new Date(),
          activeWorkerId
        );
      });
      return;
    }

    // Definite transient failure: retry with bounded backoff.
    const newAttempts = (job.attempts || 0) + 1;
    const isTerminal = newAttempts >= (job.maxAttempts || 5);

    let backoffSec = Math.min(1800, Math.pow(2, newAttempts) * 10 + Math.floor(Math.random() * 5));
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      backoffSec = Math.min(1800, retryAfterSeconds);
    }
    const nextAttempt = new Date(Date.now() + backoffSec * 1000);

    if (isTerminal) {
      await db.transaction(async (tx) => {
        await failQueuedBatch(
          tx,
          jobId,
          emailMessageId,
          gymId,
          batchRecipients.map((r) => r.id),
          billingPeriod,
          `Delivery retries exhausted: ${errorMsg}`,
          new Date(),
          activeWorkerId
        );
      });
      return;
    }

    await db
      .update(emailOutbox)
      .set({
        jobStatus: 'PENDING',
        attempts: newAttempts,
        nextAttemptAt: nextAttempt,
        lastError: errorMsg,
        completedAt: null,
        updatedAt: new Date(),
        currentAttemptId: null,
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
        lastHeartbeatAt: null,
      })
      .where(
        and(
          eq(emailOutbox.id, jobId),
          eq(emailOutbox.jobStatus, 'PROCESSING'),
          eq(emailOutbox.lockedBy, activeWorkerId)
        )
      );
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
}

export function startEmailWorker(): void {
  if (workerTimer) return;
  const interval = config.EMAIL_WORKER_INTERVAL_MS || 5000;
  workerTimer = setInterval(processOutboxJobs, interval);
  logger.info('[emailWorker] Email delivery background worker started', { intervalMs: interval });
}

export function stopEmailWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    logger.info('[emailWorker] Email delivery background worker stopped');
  }
}
