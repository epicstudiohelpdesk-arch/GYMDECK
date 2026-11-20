/**
 * GymDeck WhatsApp - composer preflight, job creation and history.
 *
 * The preview and the send path share one evaluator, so what the owner sees is
 * exactly what the queue enforces. Nothing is queued for members who fail
 * consent, phone validity, account state, the 24-hour window or variable rules.
 */

import { and, eq, inArray, desc, gte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../shared/database';
import {
  whatsappMessageJobs,
  gyms,
  gymMembers,
  whatsappMessageConsents,
} from '../../shared/database/schema';
import { config } from '../../shared/config';
import { AppError } from '../../shared/errors';
import { whatsappAccountService } from './accountService';
import { templateService } from './templateService';
import { whatsappConsentService } from './consentService';
import { whatsappCustomerWindowService } from './customerWindowService';
import { memberContextService, MAX_RECIPIENTS, formatWhatsAppDate } from './memberContext';
import type { AudienceFilter, MemberContext } from './memberContext';
import { renderWhatsAppMessage, sanitizeWhatsAppBody, extractVariableNames } from './variables';
import { evaluateDelivery, OWNER_ERRORS } from './policy';
import { getUtilityTemplate, getUtilityTemplateByName } from './templates';
import { normalizeWhatsAppNumber } from './phone';
import { sha256 } from './signature';
import { recordWhatsAppAudit } from './audit';

export interface ComposeInput {
  audience: AudienceFilter;
  body?: string;
  intent?: string;
  templateId?: string;
  scheduledAt?: string | null;
  clientBatchId?: string;
  confirm?: boolean;
  classTime?: string;
  paymentAmount?: number;
  paymentDueDate?: string;
}

interface PlannedRecipient {
  member: MemberContext;
  eligible: boolean;
  mode: 'TEXT' | 'TEMPLATE' | 'BLOCKED';
  reasonCode: string | null;
  ownerMessage: string | null;
  renderedText: string | null;
  templateParameters: string[];
  normalizedPhone: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class WhatsAppMessageService {
  private async gymName(gymId: string): Promise<string> {
    const rows = await db
      .select({ name: gyms.name })
      .from(gyms)
      .where(eq(gyms.id, gymId))
      .limit(1);
    return rows[0]?.name || 'your gym';
  }

  /** Tenant-scoped audience for the recipient selector. */
  public async audience(gymId: string, filter: AudienceFilter): Promise<any> {
    const members = await memberContextService.loadAudience(gymId, filter);
    const account = await whatsappAccountService.getAccount(gymId);
    const consents = await whatsappConsentService.getMany(
      gymId,
      members.map((member) => member.id)
    );

    const rows = members.map((member) => {
      const dto = memberContextService.toAudienceDto(member);
      const consent = consents.get(member.id);
      return {
        ...dto,
        consentStatus: consent?.status ?? 'PENDING',
        eligibleForWhatsApp: Boolean(member.normalizedPhone) && consent?.status === 'GRANTED',
      };
    });

    return {
      total: rows.length,
      eligible: rows.filter((row) => row.eligibleForWhatsApp).length,
      accountStatus: account?.connectionStatus ?? 'NOT_CONNECTED',
      members: rows,
    };
  }

  private async resolveTemplate(
    gymId: string,
    input: ComposeInput
  ): Promise<any | null> {
    if (input.templateId) {
      const template = await templateService.findById(gymId, input.templateId);
      if (!template) throw AppError.notFound('Template not found in this gym.');
      return template;
    }
    if (input.intent) {
      return templateService.findUsableForIntent(gymId, input.intent);
    }
    return null;
  }

  /**
   * OpenWA sends through the gym's own linked WhatsApp account, so GymDeck has
   * no per-message provider charge to estimate.
   */
  private estimateCharges(_eligibleCount: number): any | null {
    return null;
  }

  /**
   * Evaluate every selected recipient without writing anything. This is the
   * preview shown before the owner presses SEND WHATSAPP.
   */
  public async preview(gymId: string, input: ComposeInput): Promise<any> {
    await templateService.seedDefaults(gymId);
    const plan = await this.plan(gymId, input);

    const eligible = plan.recipients.filter((recipient) => recipient.eligible);
    const modes = new Set(eligible.map((recipient) => recipient.mode));
    const effectiveMode = modes.size === 1 ? [...modes][0] : modes.size === 0 ? plan.mode : 'MIXED';
    const account = plan.account
      ? {
          id: plan.account.id,
          businessPhoneNumber: plan.account.businessPhoneNumber,
          displayName: plan.account.displayName,
          connectionStatus: plan.account.connectionStatus,
          isLive: plan.account.connectionStatus === 'CONNECTED',
          isSandbox: false,
          isDevelopment: false,
          provider: plan.account.provider || 'OPENWA',
        }
      : null;

    return {
      account,
      template: plan.templateView,
      mode: effectiveMode,
      windowRule:
        effectiveMode === 'TEXT' || Boolean(input.body?.trim())
          ? 'Direct gateway delivery via connected WhatsApp session.'
          : effectiveMode === 'MIXED'
            ? 'Some members have an open 24-hour window and will receive text; the rest need an approved utility template.'
            : 'An approved utility template is required because the 24-hour customer window is closed.',
      estimatedCharges: this.estimateCharges(eligible.length),
      billingNote:
        'Messages are sent from the gym\'s own linked WhatsApp account through OpenWA. GymDeck adds no per-message charge.',
      counts: {
        selected: plan.recipients.length,
        eligible: eligible.length,
        blocked: plan.recipients.length - eligible.length,
      },
      recipients: plan.recipients.map((recipient) => ({
        memberId: recipient.member.id,
        fullName: recipient.member.fullName,
        memberCode: recipient.member.memberCode,
        phoneMasked: memberContextService.toAudienceDto(recipient.member).phoneMasked,
        eligible: recipient.eligible,
        mode: recipient.mode,
        reasonCode: recipient.reasonCode,
        ownerMessage: recipient.ownerMessage,
        preview: recipient.renderedText,
      })),
      canSend: eligible.length > 0,
    };
  }

  private async plan(
    gymId: string,
    input: ComposeInput
  ): Promise<{
    account: any;
    members: MemberContext[];
    recipients: PlannedRecipient[];
    mode: 'TEXT' | 'TEMPLATE';
    templateView: any;
    templateRow: any;
    body: string;
  }> {
    const rawBody = input.body ? sanitizeWhatsAppBody(input.body) : '';
    if (rawBody.length > 2000) {
      throw AppError.validation('Message cannot exceed 2000 characters.');
    }

    const account = await whatsappAccountService.getAccount(gymId);
    const accountStatus = account?.connectionStatus ?? null;

    const members = await memberContextService.loadAudience(gymId, {
      ...input.audience,
      limit: input.audience?.limit ?? MAX_RECIPIENTS,
    });
    if (!members.length) {
      throw AppError.validation('No members match the selected audience.');
    }
    if (members.length > MAX_RECIPIENTS) {
      throw AppError.validation(`Select at most ${MAX_RECIPIENTS} members per send.`);
    }

    const templateRow = await this.resolveTemplate(gymId, input);
    const definition = templateRow
      ? getUtilityTemplateByName(templateRow.templateName) ||
        (input.intent ? getUtilityTemplate(input.intent) : null)
      : input.intent
        ? getUtilityTemplate(input.intent)
        : null;

    const sourceBody = rawBody || definition?.body || '';
    if (!sourceBody.trim()) {
      throw AppError.validation('Write a message or choose a notification template.');
    }

    const gymName = await this.gymName(gymId);
    const consents = await whatsappConsentService.getMany(
      gymId,
      members.map((member) => member.id)
    );
    const windows = account
      ? await whatsappCustomerWindowService.getMany(
          gymId,
          members.map((member) => member.id),
          account.id
        )
      : new Map<string, boolean>();

    const mode: 'TEXT' | 'TEMPLATE' =
      account && members.some((member) => windows.get(member.id)) ? 'TEXT' : 'TEMPLATE';

    const templateKeys: string[] = templateRow?.isDevelopment
      ? []
      : templateRow
      ? (() => {
          try {
            const parsed = templateRow.variableKeys ? JSON.parse(templateRow.variableKeys) : [];
            return Array.isArray(parsed) && parsed.length
              ? parsed
              : extractVariableNames(definition?.body || '');
          } catch {
            return extractVariableNames(definition?.body || '');
          }
        })()
      : extractVariableNames(sourceBody);

    const recipients: PlannedRecipient[] = members.map((member) => {
      const consent = consents.get(member.id);
      const windowOpen = Boolean(windows.get(member.id));

      const evaluation = evaluateDelivery({
        accountStatus,
        hasValidPhone: Boolean(member.normalizedPhone),
        consentStatus: consent?.status ?? null,
        messageKind: 'UTILITY',
        windowOpen,
        template: templateRow
          ? {
              approvalStatus: templateRow.approvalStatus,
              category: templateRow.category,
            }
          : null,
      });

      const values = memberContextService.buildVariableValues(member, {
        gymName,
        paymentAmount: input.paymentAmount ?? null,
        paymentDueDate: input.paymentDueDate ?? null,
        classTime: input.classTime ?? null,
      });

      const isCustomBody = Boolean(rawBody && rawBody.trim());
      const renderSource = isCustomBody
        ? sourceBody
        : evaluation.mode === 'TEMPLATE'
          ? definition?.body || sourceBody
          : sourceBody;
      const rendered = renderWhatsAppMessage(renderSource, values);

      let eligible = evaluation.allowed;
      let reasonCode = evaluation.reasonCode;
      let ownerMessage = evaluation.ownerMessage;
      let renderedText = rendered.text;

      // When the gym owner writes a custom message, check variables against that custom message.
      // If the owner typed free text without missing variables, don't fail for template variables!
      if (isCustomBody) {
        if (!rendered.unknownVariables.length && !rendered.missingVariables.length && renderedText.trim()) {
          eligible = true;
          reasonCode = null;
          ownerMessage = null;
        }
      }

      if (eligible && rendered.unknownVariables.length) {
        eligible = false;
        reasonCode = 'UNKNOWN_VARIABLE';
        ownerMessage = `Unknown variable: ${rendered.unknownVariables
          .map((name) => `{{${name}}}`)
          .join(', ')}.`;
      } else if (eligible && rendered.missingVariables.length) {
        eligible = false;
        reasonCode = 'MISSING_VARIABLES';
        ownerMessage = `${member.fullName} is missing ${rendered.missingVariables.join(', ')}.`;
      }

      let templateParameters: string[] = [];
      if (eligible && evaluation.mode === 'TEMPLATE') {
        templateParameters = templateKeys.map((key) => {
          const value = (values as Record<string, string | undefined>)[key];
          return value || '';
        });
        // Only enforce templateParameters if the message is actually an automated predefined template, not an owner's custom body
        if (!isCustomBody && templateParameters.some((value) => !value)) {
          eligible = false;
          reasonCode = 'MISSING_TEMPLATE_VARIABLES';
          ownerMessage = `${member.fullName} is missing data required by the approved template.`;
        }
      }

      if (evaluation.mode === 'TEXT' && !renderedText.trim()) {
        eligible = false;
        reasonCode = 'EMPTY_MESSAGE';
        ownerMessage = 'The message is empty after personalisation.';
      }

      return {
        member,
        eligible,
        mode: eligible ? evaluation.mode : 'BLOCKED',
        reasonCode,
        ownerMessage,
        renderedText: renderedText || null,
        templateParameters,
        normalizedPhone: member.normalizedPhone,
      };
    });

    return {
      account,
      members,
      recipients,
      mode,
      templateView: templateRow
        ? {
            id: templateRow.id,
            templateName: templateRow.templateName,
            language: templateRow.language,
            category: templateRow.category,
            approvalStatus: templateRow.approvalStatus,
            isDevelopment: Boolean(templateRow.isDevelopment),
            label:
              definition?.label ||
              (templateRow.isDevelopment
                ? 'Development test template'
                : templateRow.templateName),
          }
        : null,
      templateRow,
      body: sourceBody,
    };
  }

  private async enforceHourlyLimit(gymId: string, toCreate: number): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(whatsappMessageJobs)
      .where(
        and(
          eq(whatsappMessageJobs.gymId, gymId),
          gte(whatsappMessageJobs.createdAt, since)
        )
      );
    const used = Number(rows[0]?.count || 0);
    if (used + toCreate > config.WHATSAPP_MAX_SENDS_PER_HOUR) {
      throw AppError.rateLimited(
        `This gym has reached its hourly WhatsApp send limit (${config.WHATSAPP_MAX_SENDS_PER_HOUR}). Try again later.`
      );
    }
  }

  /** Create persistent jobs for every eligible recipient. */
  public async send(gymId: string, actorUserId: string | undefined, input: ComposeInput): Promise<any> {
    const plan = await this.plan(gymId, input);
    const eligible = plan.recipients.filter((recipient) => recipient.eligible);
    const blocked = plan.recipients.filter((recipient) => !recipient.eligible);

    if (!eligible.length) {
      throw AppError.validation(
        blocked[0]?.ownerMessage || 'None of the selected members can receive this message.'
      );
    }
    if (eligible.length > 1 && input.confirm !== true) {
      throw AppError.validation('Confirm the bulk send before queueing messages.');
    }

    await this.enforceHourlyLimit(gymId, eligible.length);

    if (!plan.account) {
      throw AppError.forbidden(OWNER_ERRORS.ACCOUNT_NOT_CONNECTED);
    }

    const clientBatchId = input.clientBatchId && UUID_RE.test(input.clientBatchId)
      ? input.clientBatchId
      : randomUUID();
    const batchId = clientBatchId;
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw AppError.validation('The scheduled time is invalid.');
    }

    const now = new Date();
    const rows = eligible.map((recipient) => {
      const idempotencyKey = sha256(
        `whatsapp:${gymId}:${batchId}:${recipient.member.id}`
      );
      const payload =
        recipient.mode === 'TEXT'
          ? {
              type: 'TEXT',
              body: recipient.renderedText,
            }
          : {
              type: 'TEMPLATE',
              templateName: plan.templateRow?.templateName,
              language: plan.templateRow?.language || 'en',
              parameters: recipient.templateParameters,
              preview: recipient.renderedText,
              // OpenWA sends the rendered text; keep it in the persisted payload
              // so a queue retry after restart sends the exact same content.
              body: recipient.renderedText,
            };

      return {
        gymId,
        batchId,
        memberId: recipient.member.id,
        senderAccountId: plan.account.id,
        recipientNumber: recipient.normalizedPhone || '',
        recipientName: recipient.member.fullName,
        messageType: recipient.mode,
        environment: 'PRODUCTION',
        templateId: recipient.mode === 'TEMPLATE' ? plan.templateRow?.id ?? null : null,
        messagePayload: JSON.stringify(payload),
        renderedPreview: recipient.renderedText,
        idempotencyKey,
        dedupeKey: null,
        deliveryStatus: 'QUEUED',
        scheduledAt,
        nextAttemptAt: scheduledAt ?? now,
        createdBy: actorUserId ?? null,
      };
    });

    let created: any[] = [];
    try {
      created = await db.insert(whatsappMessageJobs).values(rows).returning({
        id: whatsappMessageJobs.id,
        memberId: whatsappMessageJobs.memberId,
        deliveryStatus: whatsappMessageJobs.deliveryStatus,
      });
    } catch (err: any) {
      // Unique idempotency/dedupe violation means this batch was already accepted.
      if (err?.code === '23505') {
        return {
          batchId,
          duplicate: true,
          queued: 0,
          skipped: plan.recipients.length,
          jobs: [],
          message: 'This send was already queued. No duplicate messages were created.',
        };
      }
      throw err;
    }

    const sentModes = new Set(eligible.map((recipient) => recipient.mode));
    const resultMode = sentModes.size === 1 ? [...sentModes][0] : 'MIXED';

    await recordWhatsAppAudit({
      gymId,
      actorId: actorUserId,
      action: 'WHATSAPP_MESSAGES_QUEUED',
      targetId: batchId,
      metadata: {
        mode: resultMode,
        queued: created.length,
        skipped: blocked.length,
        templateName: plan.templateRow?.templateName ?? null,
        scheduled: Boolean(scheduledAt),
        simulated: plan.account.connectionStatus === 'SANDBOX',
      },
    });

    return {
      batchId,
      duplicate: false,
      queued: created.length,
      skipped: blocked.length,
      mode: resultMode,
      simulated: false,
      environment: 'PRODUCTION',
      estimatedCharges: this.estimateCharges(eligible.length),
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
      skippedReasons: blocked.map((recipient) => ({
        memberId: recipient.member.id,
        fullName: recipient.member.fullName,
        reasonCode: recipient.reasonCode,
        ownerMessage: recipient.ownerMessage,
      })),
      jobs: created.map((job) => ({
        id: job.id,
        memberId: job.memberId,
        deliveryStatus: job.deliveryStatus,
      })),
    };
  }

  public async history(
    gymId: string,
    filter: { status?: string; search?: string; limit?: number; offset?: number } = {}
  ): Promise<any> {
    const limit = Math.min(200, Math.max(1, Number(filter.limit) || 50));
    const offset = Math.max(0, Number(filter.offset) || 0);

    const conditions: any[] = [eq(whatsappMessageJobs.gymId, gymId)];
    if (filter.status && filter.status !== 'ALL') {
      conditions.push(eq(whatsappMessageJobs.deliveryStatus, filter.status));
    }
    if (filter.search?.trim()) {
      const term = `%${filter.search.trim().slice(0, 80)}%`;
      conditions.push(
        sql`(${whatsappMessageJobs.recipientName} ILIKE ${term} OR ${whatsappMessageJobs.recipientNumber} ILIKE ${term})`
      );
    }

    const rows = await db
      .select({
        job: whatsappMessageJobs,
        profilePhotoUrl: gymMembers.profilePhotoUrl,
      })
      .from(whatsappMessageJobs)
      .leftJoin(gymMembers, eq(whatsappMessageJobs.memberId, gymMembers.id))
      .where(and(...conditions))
      .orderBy(desc(whatsappMessageJobs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      limit,
      offset,
      messages: rows.map(({ job, profilePhotoUrl }) =>
        this.toJobDto({ ...job, profilePhotoUrl })
      ),
    };
  }

  public async getJob(gymId: string, jobId: string): Promise<any> {
    const rows = await db
      .select({
        job: whatsappMessageJobs,
        profilePhotoUrl: gymMembers.profilePhotoUrl,
      })
      .from(whatsappMessageJobs)
      .leftJoin(gymMembers, eq(whatsappMessageJobs.memberId, gymMembers.id))
      .where(
        and(eq(whatsappMessageJobs.id, jobId), eq(whatsappMessageJobs.gymId, gymId))
      )
      .limit(1);
    if (!rows[0]) throw AppError.notFound('Message not found.');
    return this.toJobDto({ ...rows[0].job, profilePhotoUrl: rows[0].profilePhotoUrl });
  }

  public async cancel(gymId: string, jobId: string, actorUserId?: string): Promise<any> {
    const [updated] = await db
      .update(whatsappMessageJobs)
      .set({
        deliveryStatus: 'CANCELLED',
        failureReason: 'Cancelled by the gym owner before sending.',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappMessageJobs.id, jobId),
          eq(whatsappMessageJobs.gymId, gymId),
          eq(whatsappMessageJobs.deliveryStatus, 'QUEUED')
        )
      )
      .returning({ id: whatsappMessageJobs.id });

    if (!updated) {
      throw AppError.conflict('Only queued messages can be cancelled.');
    }

    await recordWhatsAppAudit({
      gymId,
      actorId: actorUserId,
      action: 'WHATSAPP_MESSAGE_CANCELLED',
      targetId: jobId,
    });

    return { id: jobId, deliveryStatus: 'CANCELLED' };
  }

  public async deleteJob(gymId: string, jobId: string, actorUserId?: string): Promise<any> {
    const [deleted] = await db
      .delete(whatsappMessageJobs)
      .where(
        and(
          eq(whatsappMessageJobs.id, jobId),
          eq(whatsappMessageJobs.gymId, gymId)
        )
      )
      .returning({ id: whatsappMessageJobs.id });

    if (!deleted) {
      throw AppError.notFound('Message record not found.');
    }

    await recordWhatsAppAudit({
      gymId,
      actorId: actorUserId,
      action: 'WHATSAPP_MESSAGE_DELETED',
      targetId: jobId,
    });

    return { id: jobId, deleted: true };
  }

  private toJobDto(row: any): any {
    const tail = String(row.recipientNumber || '').slice(-4);
    const cc = String(row.recipientNumber || '').slice(0, Math.max(2, String(row.recipientNumber || '').length - 10));
    let payload: any = null;
    try {
      payload = row.messagePayload ? JSON.parse(row.messagePayload) : null;
    } catch {
      payload = null;
    }

    return {
      id: row.id,
      batchId: row.batchId,
      memberId: row.memberId,
      recipientName: row.recipientName,
      recipientPhoto: row.profilePhotoUrl || null,
      recipientMasked: tail ? `+${cc} ••••• ${tail}` : null,
      messageType: row.messageType,
      environment: row.environment || 'PRODUCTION',
      templateName: payload?.templateName ?? null,
      preview: row.renderedPreview,
      deliveryStatus: row.deliveryStatus,
      failureCode: row.failureCode,
      failureReason: this.ownerFacingFailure(row.failureCode, row.failureReason),
      attemptCount: row.attemptCount,
      simulated: false,
      scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : null,
      submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
      deliveredAt: row.deliveredAt ? new Date(row.deliveredAt).toISOString() : null,
      readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  /** Never surface a raw provider stack trace to an owner. */
  private ownerFacingFailure(code: string | null, raw: string | null): string | null {
    if (!code && !raw) return null;
    if (code === 'AUTHENTICATION') return OWNER_ERRORS.ACCOUNT_REQUIRES_REAUTH;
    if (code === 'INVALID_TEMPLATE') return 'WhatsApp rejected the notification template.';
    if (code === 'INVALID_RECIPIENT') return OWNER_ERRORS.INVALID_RECIPIENT;
    if (code === 'RATE_LIMITED') return 'WhatsApp is rate limiting messages. GymDeck will retry where safe.';
    if (code === 'TRANSIENT') return OWNER_ERRORS.TEMPORARY_FAILURE;
    return raw ? raw.slice(0, 300) : 'Message could not be sent.';
  }

  /** Dashboard counters. Today is the gym-local day (Asia/Kolkata). */
  public async overview(gymId: string): Promise<any> {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const startIst = Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate()
    );
    const startUtc = new Date(startIst - istOffsetMs);

    const rows = await db
      .select({
        status: whatsappMessageJobs.deliveryStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(whatsappMessageJobs)
      .where(
        and(
          eq(whatsappMessageJobs.gymId, gymId),
          gte(whatsappMessageJobs.createdAt, startUtc)
        )
      )
      .groupBy(whatsappMessageJobs.deliveryStatus);

    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.status] = Number(row.count);

    const templates = await templateService.list(gymId);
    const connection = await whatsappAccountService.getConnection(gymId);

    const members = await db
      .select({ id: gymMembers.id, whatsappOptIn: gymMembers.whatsappOptIn })
      .from(gymMembers)
      .where(and(eq(gymMembers.gymId, gymId), sql`${gymMembers.deletedAt} IS NULL`));
    const explicit = await db
      .select({
        memberId: whatsappMessageConsents.memberId,
        status: whatsappMessageConsents.consentStatus,
      })
      .from(whatsappMessageConsents)
      .where(eq(whatsappMessageConsents.gymId, gymId));
    const explicitMap = new Map(explicit.map((row) => [row.memberId, row.status]));

    let granted = 0;
    let withdrawn = 0;
    let pending = 0;
    for (const member of members) {
      const status = explicitMap.get(member.id) ?? (member.whatsappOptIn ? 'GRANTED' : 'WITHDRAWN');
      if (status === 'GRANTED') granted += 1;
      else if (status === 'WITHDRAWN') withdrawn += 1;
      else pending += 1;
    }

    return {
      connection,
      today: {
        queued: counts.QUEUED || 0,
        processing: counts.PROCESSING || 0,
        accepted: counts.ACCEPTED || 0,
        sent: counts.SENT || 0,
        delivered: counts.DELIVERED || 0,
        read: counts.READ || 0,
        failed: counts.FAILED || 0,
        rejected: counts.REJECTED || 0,
        cancelled: counts.CANCELLED || 0,
      },
      templates: {
        total: templates.length,
        approved: templates.filter((template) => template.approvalStatus === 'APPROVED').length,
        pending: templates.filter((template) => template.approvalStatus === 'PENDING').length,
        rejected: templates.filter((template) => template.approvalStatus === 'REJECTED').length,
        notSubmitted: templates.filter((template) => template.approvalStatus === 'NOT_SUBMITTED').length,
      },
      consent: {
        totalMembers: members.length,
        granted,
        withdrawn,
        pending,
      },
      generatedAt: now.toISOString(),
    };
  }

  /** Resolve an inbound sender to a member for opt-out + window handling. */
  public async findMemberByPhone(gymId: string, phone: string): Promise<string | null> {
    const normalized = normalizeWhatsAppNumber(phone);
    if (!normalized) return null;

    const rows = await db
      .select({ id: gymMembers.id, phone: gymMembers.phone })
      .from(gymMembers)
      .where(and(eq(gymMembers.gymId, gymId), sql`${gymMembers.deletedAt} IS NULL`));

    const match = rows.find((row) => normalizeWhatsAppNumber(row.phone) === normalized);
    return match?.id ?? null;
  }

  /** Owner-facing membership expiry summary used by automation previews. */
  public async expiringMemberCount(gymId: string, days: number): Promise<number> {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ id: gymMembers.id })
      .from(gymMembers)
      .where(
        and(
          eq(gymMembers.gymId, gymId),
          sql`${gymMembers.deletedAt} IS NULL`,
          gte(gymMembers.expiresAt, now),
          sql`${gymMembers.expiresAt} <= ${horizon.toISOString()}`
        )
      );
    return rows.length;
  }

  public async listScheduled(gymId: string): Promise<any[]> {
    const rows = await db
      .select()
      .from(whatsappMessageJobs)
      .where(
        and(
          eq(whatsappMessageJobs.gymId, gymId),
          inArray(whatsappMessageJobs.deliveryStatus, ['QUEUED', 'PROCESSING'])
        )
      )
      .orderBy(whatsappMessageJobs.scheduledAt)
      .limit(100);
    return rows.map((row) => this.toJobDto(row));
  }

  public formatDate(value: Date | null): string | null {
    return formatWhatsAppDate(value);
  }
}

export const whatsappMessageService = new WhatsAppMessageService();
export default whatsappMessageService;
