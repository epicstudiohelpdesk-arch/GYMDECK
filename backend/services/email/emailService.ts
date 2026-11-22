/**
 * GymDeck Email Business Service
 *
 * Implements core email management:
 *  - Overview & statistics
 *  - Member recipient resolution with filters
 *  - Email dispatch with atomic quota reservation & durable outbox queueing
 *  - Drafts management
 *  - Message history & recipient delivery logs
 *  - Templates
 */

import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  emailMessages,
  emailRecipients,
  emailOutbox,
  emailTemplates,
  gymMembers,
  gyms,
} from '../../shared/database/schema';
import { emailQuotaService, QuotaStatus } from './quotaService';
import { findSuppressedEmails, normalizeEmailAddress } from './suppressionService';
import { AppError } from '../../shared/errors';
import { config } from '../../shared/config';
import { processOutboxJobs } from './deliveryWorker';

export interface EmailOverview {
  quota: QuotaStatus;
  metrics: {
    totalSentThisMonth: number;
    deliveredCount: number;
    bouncedCount: number;
    failedCount: number;
    queuedCount: number;
    successRate: number;
  };
  recentMessages: any[];
}

export interface ComposeEmailDto {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  senderDisplayName?: string;
  replyToAddress?: string;
  recipients: Array<{
    memberId?: string;
    email: string;
    name?: string;
  }>;
  idempotencyKey?: string;
}

export class EmailService {
  /**
   * Fetch complete email dashboard overview.
   */
  public async getOverview(gymId: string): Promise<EmailOverview> {
    const quota = await emailQuotaService.getQuotaStatus(gymId);

    // Sum monthly delivery stats
    const statsRows = await db
      .select({
        totalRecipients: sql<number>`coalesce(sum(${emailMessages.recipientCount}), 0)`,
        delivered: sql<number>`coalesce(sum(${emailMessages.deliveredCount}), 0)`,
        bounced: sql<number>`coalesce(sum(${emailMessages.bouncedCount}), 0)`,
        failed: sql<number>`coalesce(sum(${emailMessages.failedCount}), 0)`,
      })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.gymId, gymId),
          sql`to_char(${emailMessages.createdAt}, 'YYYY-MM') = ${quota.billingPeriod}`
        )
      );

    const stats = statsRows[0] || {
      totalRecipients: 0,
      delivered: 0,
      bounced: 0,
      failed: 0,
    };

    const sentThisMonth = Number(stats.totalRecipients);
    const delivered = Number(stats.delivered);
    const bounced = Number(stats.bounced);
    const failed = Number(stats.failed);
    const successRate = sentThisMonth > 0 ? Math.round((delivered / sentThisMonth) * 100) : 100;

    // Recent 5 broadcasts
    const recentMessages = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.gymId, gymId))
      .orderBy(desc(emailMessages.createdAt))
      .limit(5);

    return {
      quota,
      metrics: {
        totalSentThisMonth: sentThisMonth,
        deliveredCount: delivered,
        bouncedCount: bounced,
        failedCount: failed,
        queuedCount: quota.reservedCount,
        successRate,
      },
      recentMessages,
    };
  }

  /**
   * Search and segment members from gym database for recipient selection.
   */
  public async getRecipients(gymId: string, filter?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ members: any[]; totalCount: number; validEmailCount: number }> {
    const limit = Math.min(200, filter?.limit || 50);
    const offset = filter?.offset || 0;

    const conditions = [eq(gymMembers.gymId, gymId)];

    if (filter?.status && filter.status !== 'ALL') {
      conditions.push(eq(gymMembers.membershipStatus, filter.status));
    }

    if (filter?.search) {
      const term = `%${filter.search}%`;
      conditions.push(
        sql`(${gymMembers.fullName} ILIKE ${term} OR ${gymMembers.email} ILIKE ${term} OR ${gymMembers.phone} ILIKE ${term})`
      );
    }

    const members = await db
      .select({
        id: gymMembers.id,
        memberCode: gymMembers.memberCode,
        fullName: gymMembers.fullName,
        email: gymMembers.email,
        phone: gymMembers.phone,
        membershipStatus: gymMembers.membershipStatus,
        expiresAt: gymMembers.expiresAt,
        profilePhotoUrl: gymMembers.profilePhotoUrl,
      })
      .from(gymMembers)
      .where(and(...conditions))
      .orderBy(gymMembers.fullName)
      .limit(limit)
      .offset(offset);

    // Total count
    const countRows = await db
      .select({
        total: sql<number>`count(*)`,
        validEmail: sql<number>`count(*) filter (where ${gymMembers.email} is not null and ${gymMembers.email} != '')`,
      })
      .from(gymMembers)
      .where(and(...conditions));

    return {
      members,
      totalCount: Number(countRows[0]?.total || 0),
      validEmailCount: Number(countRows[0]?.validEmail || 0),
    };
  }

  /**
   * Send email broadcast with atomic quota reservation and durable queueing.
   *
   * Idempotency, quota, message, recipients and outbox are committed in one
   * transaction. A transaction-scoped advisory lock serializes concurrent
   * requests that share an idempotency key, so the loser observes the winner's
   * message instead of racing the unique index after reserving quota.
   */
  public async sendEmail(
    gymId: string,
    userId: string,
    dto: ComposeEmailDto,
    options: { triggerWorker?: boolean } = {}
  ): Promise<any> {
    if (!dto.subject?.trim()) throw AppError.validation('Subject is required.');
    if (!dto.bodyHtml?.trim()) throw AppError.validation('Email content is required.');

    // 1. Validate and deduplicate recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanRecipients: Array<{ memberId?: string; email: string; name?: string }> = [];
    const seenEmails = new Set<string>();

    for (const r of dto.recipients) {
      const email = r.email ? normalizeEmailAddress(r.email) : '';
      if (email && emailRegex.test(email) && !seenEmails.has(email)) {
        seenEmails.add(email);
        cleanRecipients.push({
          memberId: r.memberId,
          email,
          name: r.name?.trim(),
        });
      }
    }

    if (cleanRecipients.length === 0) {
      throw AppError.validation('No valid recipient email addresses provided.');
    }

    const message = await db.transaction(async (tx) => {
      // 2. Serialize same-key requests for this tenant before checking/inserting.
      if (dto.idempotencyKey) {
        const lockKey = `${gymId}:${dto.idempotencyKey}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

        const existing = await tx
          .select()
          .from(emailMessages)
          .where(and(eq(emailMessages.gymId, gymId), eq(emailMessages.idempotencyKey, dto.idempotencyKey)))
          .limit(1);

        if (existing.length > 0) return existing[0];
      }

      // 3. Suppressed recipients never consume a quota unit and are never enqueued.
      const suppressed = await findSuppressedEmails(
        tx,
        cleanRecipients.map((r) => r.email)
      );
      const deliverableRecipients = cleanRecipients.filter((r) => !suppressed.has(r.email));

      if (deliverableRecipients.length === 0) {
        throw AppError.validation('All recipient addresses are suppressed.');
      }

      // 4. Reserve quota inside the transaction.
      await emailQuotaService.reserveQuota(gymId, deliverableRecipients.length, tx);

      // 5. Resolve sender defaults from gym profile if needed.
      const gymRows = await tx.select().from(gyms).where(eq(gyms.id, gymId)).limit(1);
      const gym = gymRows[0];
      const senderName = dto.senderDisplayName?.trim() || gym?.name || config.POSTAL_DEFAULT_FROM_NAME;
      const fromAddress = config.POSTAL_DEFAULT_FROM_EMAIL;
      const replyTo = dto.replyToAddress?.trim() || gym?.contactEmail || undefined;

      // 6. Persist message, recipients and outbox atomically.
      const insertedMessages = await tx
        .insert(emailMessages)
        .values({
          gymId,
          createdByUserId: userId,
          subject: dto.subject.trim(),
          bodyHtml: dto.bodyHtml,
          bodyText: dto.bodyText || dto.bodyHtml.replace(/<[^>]+>/g, ' '),
          senderDisplayName: senderName,
          fromAddress,
          replyToAddress: replyTo,
          status: 'QUEUED',
          idempotencyKey: dto.idempotencyKey || null,
          recipientCount: deliverableRecipients.length,
          queuedAt: new Date(),
        })
        .returning();

      const created = insertedMessages[0];
      if (!created) throw AppError.database('Failed to create email message record.');

      await tx.insert(emailRecipients).values(
        deliverableRecipients.map((r) => ({
          gymId,
          emailMessageId: created.id,
          memberId: r.memberId || null,
          recipientEmail: r.email,
          recipientName: r.name || null,
          deliveryStatus: 'QUEUED',
        }))
      );

      await tx.insert(emailOutbox).values({
        gymId,
        emailMessageId: created.id,
        jobStatus: 'PENDING',
        nextAttemptAt: new Date(),
      });

      return created;
    });

    if (!message) throw AppError.database('Failed to create email message record.');

    // Trigger immediate background sweep asynchronously (disabled by tests).
    if (options.triggerWorker !== false) {
      setImmediate(() => {
        processOutboxJobs().catch(() => {});
      });
    }

    return message;
  }

  /**
   * Save or update email draft.
   */
  public async saveDraft(gymId: string, userId: string, dto: ComposeEmailDto, draftId?: string): Promise<any> {
    const fromAddress = config.POSTAL_DEFAULT_FROM_EMAIL;

    if (draftId) {
      const [updated] = await db
        .update(emailMessages)
        .set({
          subject: dto.subject || 'Untitled Draft',
          bodyHtml: dto.bodyHtml || '',
          bodyText: dto.bodyText || '',
          senderDisplayName: dto.senderDisplayName || null,
          replyToAddress: dto.replyToAddress || null,
          recipientCount: dto.recipients?.length || 0,
          updatedAt: new Date(),
        })
        .where(and(eq(emailMessages.id, draftId), eq(emailMessages.gymId, gymId), eq(emailMessages.status, 'DRAFT')))
        .returning();
      return updated;
    }

    const [draft] = await db
      .insert(emailMessages)
      .values({
        gymId,
        createdByUserId: userId,
        subject: dto.subject || 'Untitled Draft',
        bodyHtml: dto.bodyHtml || '',
        bodyText: dto.bodyText || '',
        senderDisplayName: dto.senderDisplayName || null,
        fromAddress,
        replyToAddress: dto.replyToAddress || null,
        status: 'DRAFT',
        recipientCount: dto.recipients?.length || 0,
      })
      .returning();

    return draft;
  }

  /**
   * Sent message history list.
   */
  public async getHistory(gymId: string, params?: { limit?: number; offset?: number; search?: string }): Promise<any> {
    const limit = Math.min(100, params?.limit || 20);
    const offset = params?.offset || 0;

    const conditions = [eq(emailMessages.gymId, gymId), sql`${emailMessages.status} != 'DRAFT'`];

    if (params?.search) {
      conditions.push(ilike(emailMessages.subject, `%${params.search}%`));
    }

    const messages = await db
      .select()
      .from(emailMessages)
      .where(and(...conditions))
      .orderBy(desc(emailMessages.createdAt))
      .limit(limit)
      .offset(offset);

    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailMessages)
      .where(and(...conditions));

    return {
      messages,
      totalCount: Number(countRows[0]?.count || 0),
    };
  }

  /**
   * Drafts list.
   */
  public async getDrafts(gymId: string): Promise<any[]> {
    return db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.gymId, gymId), eq(emailMessages.status, 'DRAFT')))
      .orderBy(desc(emailMessages.updatedAt));
  }

  /**
   * Inspect a single message and its individual recipients.
   */
  public async getMessageDetails(gymId: string, messageId: string): Promise<any> {
    const msgRows = await db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.id, messageId), eq(emailMessages.gymId, gymId)))
      .limit(1);

    if (msgRows.length === 0) throw AppError.notFound('Email message not found.');

    const recipients = await db
      .select()
      .from(emailRecipients)
      .where(and(eq(emailRecipients.emailMessageId, messageId), eq(emailRecipients.gymId, gymId)))
      .orderBy(emailRecipients.recipientName);

    return {
      message: msgRows[0],
      recipients,
    };
  }

  /**
   * Delete draft.
   */
  public async deleteDraft(gymId: string, draftId: string): Promise<void> {
    await db
      .delete(emailMessages)
      .where(and(eq(emailMessages.id, draftId), eq(emailMessages.gymId, gymId), eq(emailMessages.status, 'DRAFT')));
  }

  /**
   * Templates list & management.
   */
  public async getTemplates(gymId: string): Promise<any[]> {
    return db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.gymId, gymId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  public async createTemplate(gymId: string, userId: string, data: { name: string; subject: string; bodyHtml: string; category?: string }): Promise<any> {
    const [tmpl] = await db
      .insert(emailTemplates)
      .values({
        gymId,
        createdByUserId: userId,
        name: data.name.trim(),
        subject: data.subject.trim(),
        bodyHtml: data.bodyHtml,
        category: data.category || 'GENERAL',
      })
      .returning();
    return tmpl;
  }
}

export const emailService = new EmailService();
