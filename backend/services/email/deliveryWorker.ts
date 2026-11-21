/**
 * GymDeck Email Delivery Worker
 *
 * Durable background queue consumer:
 *  - Locks pending email_outbox jobs
 *  - Resolves batch recipients
 *  - Enforces suppression lists (bounces / opt-outs)
 *  - Performs Postal submission
 *  - Updates recipient statuses and commits quota
 */

import { eq, and, sql, lte, inArray, lt } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  emailOutbox,
  emailMessages,
  emailRecipients,
  emailSuppressions,
  emailDispatchAttempts,
} from '../../shared/database/schema';
import { postalClient, PostalApiError } from './postalClient';
import { emailQuotaService } from './quotaService';
import { logger } from '../../shared/logging';
import { config } from '../../shared/config';

let workerTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

// 5 minutes lease duration for background jobs
const WORKER_LEASE_MS = 5 * 60 * 1000;

/**
 * Sweep for expired worker leases (zombie jobs)
 * Handles crash scenarios:
 *  - Crash before dispatch: reset to PENDING
 *  - Crash during DISPATCHING: transition to RECONCILIATION_REQUIRED / UNKNOWN_OUTCOME to prevent duplicate send
 */
export async function recoverExpiredLeases(): Promise<number> {
  const now = new Date();
  
  // Find jobs stuck in PROCESSING where lease has expired
  const expiredJobs = await db
    .select()
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.jobStatus, 'PROCESSING'),
        lt(emailOutbox.leaseExpiresAt, now)
      )
    );

  let recoveredCount = 0;

  for (const job of expiredJobs) {
    // Check if there is an active dispatch attempt
    if (job.currentAttemptId) {
      const [attempt] = await db
        .select()
        .from(emailDispatchAttempts)
        .where(eq(emailDispatchAttempts.id, job.currentAttemptId))
        .limit(1);

      if (attempt && attempt.attemptStatus === 'DISPATCHING') {
        // Worker died while request was in-flight or before persisting Postal response!
        // Blind retry is strictly forbidden because Postal may have accepted and sent the emails.
        logger.error('[emailWorker] Zombie lease recovery: dispatch attempt was in-flight. Flagging RECONCILIATION_REQUIRED', {
          jobId: job.id,
          attemptId: attempt.id,
        });

        await db.transaction(async (tx) => {
          await tx
            .update(emailDispatchAttempts)
            .set({
              attemptStatus: 'UNKNOWN_OUTCOME',
              reconciliationNotes: 'Worker crashed or lease expired while dispatch was in-flight. Manual reconciliation or Postal status probe required.',
              updatedAt: now,
            })
            .where(eq(emailDispatchAttempts.id, attempt.id));

          await tx
            .update(emailOutbox)
            .set({
              jobStatus: 'RECONCILIATION_REQUIRED',
              lastError: 'Worker crashed during dispatch attempt. Outcome unknown; automatic retry prohibited.',
              updatedAt: now,
            })
            .where(eq(emailOutbox.id, job.id));
        });

        recoveredCount++;
        continue;
      }
    }

    // Otherwise, worker crashed before dispatch was initiated -> safe to re-queue
    logger.warn('[emailWorker] Zombie lease recovery: worker crashed before dispatch. Resetting to PENDING', {
      jobId: job.id,
    });

    await db
      .update(emailOutbox)
      .set({
        jobStatus: 'PENDING',
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
        currentAttemptId: null,
        updatedAt: now,
      })
      .where(eq(emailOutbox.id, job.id));

    recoveredCount++;
  }

  return recoveredCount;
}

export async function processOutboxJobs(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // 0. Recover any zombie leases first
    await recoverExpiredLeases();

    const now = new Date();
    const leaseExpires = new Date(now.getTime() + WORKER_LEASE_MS);
    const workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Lock a batch of pending jobs
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
        .where(eq(emailOutbox.id, jobId));
      return;
    }

    const message = msgRows[0];
    if (!message) return;

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
      await db
        .update(emailMessages)
        .set({ status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));

      await db
        .update(emailOutbox)
        .set({ jobStatus: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailOutbox.id, jobId));
      return;
    }

    // 3. Check suppressions
    const emailList = recipients.map((r) => r.recipientEmail.toLowerCase());
    const suppressions = await db
      .select()
      .from(emailSuppressions)
      .where(inArray(emailSuppressions.emailAddress, emailList));

    const suppressedSet = new Set(suppressions.map((s) => s.emailAddress.toLowerCase()));

    const activeRecipients = recipients.filter((r) => !suppressedSet.has(r.recipientEmail.toLowerCase()));
    const skippedRecipients = recipients.filter((r) => suppressedSet.has(r.recipientEmail.toLowerCase()));

    // Mark suppressed
    for (const skipped of skippedRecipients) {
      await db
        .update(emailRecipients)
        .set({
          deliveryStatus: 'SUPPRESSED',
          failureReason: 'Address suppressed due to previous bounce or opt-out',
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, skipped.id));
    }

    if (activeRecipients.length > 0) {
      const attemptNumber = (job.attempts || 0) + 1;
      const attemptStartTime = new Date();
      const leaseExpires = new Date(attemptStartTime.getTime() + WORKER_LEASE_MS);

      // 4A. Create durable email_dispatch_attempt record in state DISPATCHING before invoking provider
      const [dispatchAttempt] = await db
        .insert(emailDispatchAttempts)
        .values({
          gymId,
          emailMessageId,
          outboxId: jobId,
          attemptNumber,
          attemptStatus: 'DISPATCHING',
          provider: 'POSTAL',
          recipientCount: activeRecipients.length,
          recipientBatchIds: activeRecipients.map((r) => r.id),
          workerId: activeWorkerId,
          requestStartedAt: attemptStartTime,
          leaseExpiresAt: leaseExpires,
          lastHeartbeatAt: attemptStartTime,
        })
        .returning();

      // Attach currentAttemptId to outbox row
      await db
        .update(emailOutbox)
        .set({
          currentAttemptId: dispatchAttempt!.id,
          leaseExpiresAt: leaseExpires,
          lastHeartbeatAt: attemptStartTime,
          updatedAt: attemptStartTime,
        })
        .where(eq(emailOutbox.id, jobId));

      // 4B. Submit to Postal
      let sendResult: any;
      try {
        sendResult = await postalClient.sendMessage({
          to: activeRecipients.map((r) => r.recipientEmail),
          from: `${message.senderDisplayName || 'GymDeck'} <${message.fromAddress}>`,
          replyTo: message.replyToAddress || undefined,
          subject: message.subject,
          htmlBody: message.bodyHtml,
          plainBody: message.bodyText || undefined,
          tag: `gym_${gymId}`,
          customHeaders: {
            'X-GymDeck-Tenant': gymId,
            'X-GymDeck-Message-Id': emailMessageId,
            'X-GymDeck-Attempt-Id': dispatchAttempt!.id,
          },
        });
      } catch (postalErr: any) {
        const isPostalApiError = postalErr instanceof PostalApiError;
        const errorMsg = postalErr instanceof Error ? postalErr.message : String(postalErr);
        const isAmbiguous = isPostalApiError ? postalErr.isAmbiguous : true;
        const category = isPostalApiError ? postalErr.category : 'AMBIGUOUS_TIMEOUT';
        const httpStatus = isPostalApiError ? postalErr.httpStatus : undefined;
        const errorCode = isPostalApiError ? postalErr.code : undefined;

        // Determine terminal versus retryable status
        // CLIENT_REJECTED (400, 422) & AUTH_FAILED (401, 403) are permanent failure: retrying will never succeed
        // AMBIGUOUS_TIMEOUT: Must transition to UNKNOWN_OUTCOME / RECONCILIATION_REQUIRED (no blind retry)
        // SERVER_ERROR (5xx) & CONNECTION_FAILED (ECONNREFUSED before sending): Definite retryable non-dispatch
        let attemptStatus: 'UNKNOWN_OUTCOME' | 'REJECTED' | 'FAILED' = 'UNKNOWN_OUTCOME';
        if (isAmbiguous) {
          attemptStatus = 'UNKNOWN_OUTCOME';
        } else if (category === 'CLIENT_REJECTED' || category === 'AUTH_FAILED') {
          attemptStatus = 'REJECTED';
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
            reconciliationNotes: isAmbiguous ? 'Network timeout or ambiguous provider state. Blind retry blocked.' : undefined,
          })
          .where(eq(emailDispatchAttempts.id, dispatchAttempt!.id));

        throw postalErr;
      }

      const providerData = sendResult.data;
      const providerMessages = providerData?.messages || {};
      const completedTime = new Date();

      // 4C. Update dispatch attempt to ACCEPTED
      await db
        .update(emailDispatchAttempts)
        .set({
          attemptStatus: 'ACCEPTED',
          providerMessageId: providerData?.message_id ? String(providerData.message_id) : null,
          httpStatus: 200,
          providerResponse: providerData,
          requestCompletedAt: completedTime,
          updatedAt: completedTime,
        })
        .where(eq(emailDispatchAttempts.id, dispatchAttempt!.id));

      // 4D. Update recipients
      for (const rec of activeRecipients) {
        const pMsg = providerMessages[rec.recipientEmail];
        await db
          .update(emailRecipients)
          .set({
            deliveryStatus: 'SENT',
            providerMessageId: pMsg ? String(pMsg.id) : (providerData?.message_id ? String(providerData.message_id) : undefined),
            providerToken: pMsg ? pMsg.token : undefined,
            attempts: rec.attempts + 1,
            lastAttemptAt: completedTime,
            updatedAt: completedTime,
          })
          .where(eq(emailRecipients.id, rec.id));
      }

      // Update message counts & billing
      const billingPeriod = emailQuotaService.getCurrentBillingPeriod(message.createdAt);
      await emailQuotaService.commitQuota(gymId, billingPeriod, activeRecipients.length, activeRecipients.length);

      await db
        .update(emailMessages)
        .set({
          status: 'SENDING',
          updatedAt: completedTime,
        })
        .where(eq(emailMessages.id, emailMessageId));
    }

    // 5. Check if more recipients remain
    const remainingCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.emailMessageId, emailMessageId),
          eq(emailRecipients.gymId, gymId),
          eq(emailRecipients.deliveryStatus, 'QUEUED')
        )
      );

    const remaining = Number(remainingCountRows[0]?.count || 0);

    if (remaining === 0) {
      await db
        .update(emailMessages)
        .set({ status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));

      await db
        .update(emailOutbox)
        .set({ jobStatus: 'COMPLETED', completedAt: new Date(), updatedAt: new Date(), currentAttemptId: null })
        .where(eq(emailOutbox.id, jobId));
    } else {
      // Re-queue next slice immediately
      await db
        .update(emailOutbox)
        .set({
          jobStatus: 'PENDING',
          nextAttemptAt: new Date(),
          updatedAt: new Date(),
          currentAttemptId: null,
        })
        .where(eq(emailOutbox.id, jobId));
    }
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn('[emailWorker] Delivery error for outbox job', { jobId, error: errorMsg });

    const isPostalApiError = err instanceof PostalApiError;
    const isAmbiguous = isPostalApiError ? err.isAmbiguous : true;
    const category = isPostalApiError ? err.category : 'AMBIGUOUS_TIMEOUT';
    const retryAfterSeconds = isPostalApiError ? err.retryAfterSeconds : undefined;

    // If ambiguous (timeout / unknown outcome), STOP automated retries immediately!
    // Transition job to RECONCILIATION_REQUIRED so operators or probe reconciliation can verify.
    if (isAmbiguous) {
      await db
        .update(emailOutbox)
        .set({
          jobStatus: 'RECONCILIATION_REQUIRED',
          lastError: `Ambiguous dispatch outcome: ${errorMsg}. Automated retry blocked to prevent duplicate send.`,
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, jobId));
      return;
    }

    // If permanent client error or auth failed, fail permanently without retrying
    if (category === 'CLIENT_REJECTED' || category === 'AUTH_FAILED') {
      await db
        .update(emailOutbox)
        .set({
          jobStatus: 'FAILED',
          lastError: `Permanent provider rejection: ${errorMsg}`,
          completedAt: new Date(),
          updatedAt: new Date(),
          currentAttemptId: null,
        })
        .where(eq(emailOutbox.id, jobId));

      await db
        .update(emailMessages)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));
      return;
    }

    // For definite transient failures (SERVER_ERROR 5xx, RATE_LIMITED 429, CONNECTION_FAILED before sending):
    const newAttempts = (job.attempts || 0) + 1;
    const isTerminal = newAttempts >= (job.maxAttempts || 5);

    // Compute backoff: respect Retry-After header if provided, otherwise exponential backoff with jitter
    let backoffSec = Math.min(1800, Math.pow(2, newAttempts) * 10 + Math.floor(Math.random() * 5));
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      backoffSec = Math.min(1800, retryAfterSeconds);
    }
    const nextAttempt = new Date(Date.now() + backoffSec * 1000);

    await db
      .update(emailOutbox)
      .set({
        jobStatus: isTerminal ? 'FAILED' : 'PENDING',
        attempts: newAttempts,
        nextAttemptAt: nextAttempt,
        lastError: errorMsg,
        completedAt: isTerminal ? new Date() : null,
        updatedAt: new Date(),
        currentAttemptId: null,
      })
      .where(eq(emailOutbox.id, jobId));

    if (isTerminal) {
      await db
        .update(emailMessages)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));
    }
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

