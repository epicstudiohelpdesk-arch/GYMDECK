/**
 * GymDeck Cloud Backend - Mode A Communication Service
 *
 * Assisted delivery: builds per-recipient deep links (wa.me / mailto) so the owner
 * sends from their own official number/email. No third-party provider, no message
 * bodies persisted, no contact data leaves the tenant boundary.
 */

import * as crypto from 'crypto';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gymCommunicationSettings,
  communicationBroadcasts,
  communicationBroadcastRecipients,
  gymMembers,
  auditLogs,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export type CommunicationChannel = 'WHATSAPP' | 'EMAIL';
export type MessageKind = 'TRANSACTIONAL' | 'ANNOUNCEMENT' | 'PROMOTIONAL';
export type RecipientStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';

export const MAX_RECIPIENTS = 60;
export const MAX_BODY_LENGTH = 2000;
export const MAX_SUBJECT_LENGTH = 200;
export const BROADCAST_RETENTION_DAYS = 90;

export interface CommunicationSettingsInput {
  primaryPhone?: string | null;
  whatsappNumber?: string | null;
  officialEmail?: string | null;
  mobileForMembers?: boolean;
  mobileSmsAllowed?: boolean;
  mobileCallsAllowed?: boolean;
  mobilePromosAllowed?: boolean;
  whatsappForMembers?: boolean;
  whatsappReceiptsAllowed?: boolean;
  whatsappRemindersAllowed?: boolean;
  whatsappSupportAllowed?: boolean;
  whatsappPromosAllowed?: boolean;
  emailForMembers?: boolean;
  emailInvoicesAllowed?: boolean;
  emailAlertsAllowed?: boolean;
  emailNewsletterAllowed?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface AudienceFilter {
  status?: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE';
  search?: string;
  memberIds?: string[];
  limit?: number;
}

export interface BroadcastPreviewInput {
  channel: CommunicationChannel;
  messageKind: MessageKind;
  subject?: string;
  body: string;
  audience?: AudienceFilter;
}

export interface RecipientProgressInput {
  recipientId: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function maskPhone(input?: string | null): string | null {
  const normalized = normalizePhone(input);
  if (!normalized) return null;
  const tail = normalized.slice(-4);
  const cc = normalized.slice(0, Math.max(1, normalized.length - 10));
  return `+${cc} ••••• ${tail}`;
}

export function maskEmail(input?: string | null): string | null {
  if (!input || !EMAIL_RE.test(input)) return null;
  const [local, domain] = input.split('@');
  const head = (local || '').slice(0, 1);
  return `${head}•••@${domain}`;
}

export function hashBody(body: string): string {
  return crypto.createHash('sha256').update(body, 'utf8').digest('hex');
}

export function sanitizeMessage(raw: string): string {
  if (typeof raw !== 'string') return '';
  if (CONTROL_CHARS_RE.test(raw)) {
    throw AppError.validation('Message contains unsupported control characters.');
  }
  return raw.replace(/\r\n/g, '\n').trim();
}

const SETTINGS_DEFAULTS = {
  primaryPhone: null as string | null,
  whatsappNumber: null as string | null,
  officialEmail: null as string | null,
  mobileForMembers: true,
  mobileSmsAllowed: true,
  mobileCallsAllowed: true,
  mobilePromosAllowed: false,
  whatsappForMembers: true,
  whatsappReceiptsAllowed: true,
  whatsappRemindersAllowed: true,
  whatsappSupportAllowed: true,
  whatsappPromosAllowed: false,
  emailForMembers: true,
  emailInvoicesAllowed: true,
  emailAlertsAllowed: true,
  emailNewsletterAllowed: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
};

export class CommunicationService {
  /** Return persisted settings, or safe defaults if the gym has never saved any. */
  public async getSettings(gymId: string): Promise<any> {
    const row = (
      await db.select().from(gymCommunicationSettings)
        .where(eq(gymCommunicationSettings.gymId, gymId)).limit(1)
    )[0];
    return row ? this.toSettingsDto(row) : { gymId, ...SETTINGS_DEFAULTS, updatedAt: null };
  }

  /** Upsert settings with an actor audit trail. Only changed keys are recorded. */
  public async saveSettings(
    gymId: string,
    input: CommunicationSettingsInput,
    actorUserId?: string,
    ipAddress?: string
  ): Promise<any> {
    const clean = this.cleanSettingsInput(input);
    const existing = (
      await db.select().from(gymCommunicationSettings)
        .where(eq(gymCommunicationSettings.gymId, gymId)).limit(1)
    )[0];

    const changedKeys = Object.keys(clean).filter(
      (k) => (existing as any)?.[k] !== (clean as any)[k]
    );
    const now = new Date();

    const [saved] = await db.insert(gymCommunicationSettings)
      .values({ gymId, ...clean, updatedBy: actorUserId || null, updatedAt: now })
      .onConflictDoUpdate({
        target: gymCommunicationSettings.gymId,
        set: { ...clean, updatedBy: actorUserId || null, updatedAt: now },
      })
      .returning();

    await db.insert(auditLogs).values({
      gymId,
      actorType: 'OWNER',
      action: 'COMMUNICATION_SETTINGS_UPDATED',
      resource: 'gym_communication_settings',
      resourceId: gymId,
      ipAddress: ipAddress || null,
      metadata: JSON.stringify({
        changedKeys,
        // Never store raw contact values in the audit trail.
        primaryPhone: maskPhone(saved?.primaryPhone),
        whatsappNumber: maskPhone(saved?.whatsappNumber),
        officialEmail: maskEmail(saved?.officialEmail),
      }),
    });

    return this.toSettingsDto(saved);
  }

  private toSettingsDto(row: any): any {
    if (!row) return { ...SETTINGS_DEFAULTS };
    return {
      gymId: row.gymId,
      primaryPhone: row.primaryPhone || '',
      whatsappNumber: row.whatsappNumber || '',
      officialEmail: row.officialEmail || '',
      mobileForMembers: row.mobileForMembers,
      mobileSmsAllowed: row.mobileSmsAllowed,
      mobileCallsAllowed: row.mobileCallsAllowed,
      mobilePromosAllowed: row.mobilePromosAllowed,
      whatsappForMembers: row.whatsappForMembers,
      whatsappReceiptsAllowed: row.whatsappReceiptsAllowed,
      whatsappRemindersAllowed: row.whatsappRemindersAllowed,
      whatsappSupportAllowed: row.whatsappSupportAllowed,
      whatsappPromosAllowed: row.whatsappPromosAllowed,
      emailForMembers: row.emailForMembers,
      emailInvoicesAllowed: row.emailInvoicesAllowed,
      emailAlertsAllowed: row.emailAlertsAllowed,
      emailNewsletterAllowed: row.emailNewsletterAllowed,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  private cleanSettingsInput(input: CommunicationSettingsInput): Record<string, any> {
    const out: Record<string, any> = {};
    const bools = [
      'mobileForMembers', 'mobileSmsAllowed', 'mobileCallsAllowed', 'mobilePromosAllowed',
      'whatsappForMembers', 'whatsappReceiptsAllowed', 'whatsappRemindersAllowed',
      'whatsappSupportAllowed', 'whatsappPromosAllowed', 'emailForMembers',
      'emailInvoicesAllowed', 'emailAlertsAllowed', 'emailNewsletterAllowed',
    ] as const;
    for (const key of bools) {
      if (typeof input[key] === 'boolean') out[key] = input[key];
    }

    if (input.primaryPhone !== undefined) {
      const value = (input.primaryPhone || '').trim();
      if (value && !normalizePhone(value)) throw AppError.validation('Invalid primary phone number.');
      out.primaryPhone = value || null;
    }
    if (input.whatsappNumber !== undefined) {
      const value = (input.whatsappNumber || '').trim();
      if (value && !normalizePhone(value)) throw AppError.validation('Invalid WhatsApp number.');
      out.whatsappNumber = value || null;
    }
    if (input.officialEmail !== undefined) {
      const value = (input.officialEmail || '').trim().toLowerCase();
      if (value && !EMAIL_RE.test(value)) throw AppError.validation('Invalid official email address.');
      out.officialEmail = value || null;
    }
    for (const key of ['quietHoursStart', 'quietHoursEnd'] as const) {
      if (input[key] !== undefined) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input[key]!)) {
          throw AppError.validation(`${key} must be a valid HH:MM time.`);
        }
        out[key] = input[key];
      }
    }
    return out;
  }

  /** Tenant-scoped, consent-aware audience preview. Never returns raw contact data. */
  public async getAudience(gymId: string, filter: AudienceFilter = {}): Promise<any> {
    const limit = Math.min(200, Math.max(1, Number(filter.limit) || 100));
    const conditions: any[] = [eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)];

    if (filter.status && filter.status !== 'ALL') {
      conditions.push(eq(gymMembers.membershipStatus, filter.status));
    }
    if (filter.memberIds?.length) {
      const ids = filter.memberIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
      if (!ids.length) return { total: 0, members: [], limit };
      conditions.push(inArray(gymMembers.id, ids));
    }
    if (filter.search?.trim()) {
      const term = `%${filter.search.trim().slice(0, 80)}%`;
      conditions.push(sql`(${gymMembers.fullName} ILIKE ${term} OR ${gymMembers.phone} ILIKE ${term} OR ${gymMembers.email} ILIKE ${term})`);
    }

    const rows = await db.select({
      id: gymMembers.id,
      fullName: gymMembers.fullName,
      memberCode: gymMembers.memberCode,
      phone: gymMembers.phone,
      email: gymMembers.email,
      membershipStatus: gymMembers.membershipStatus,
      whatsappOptIn: gymMembers.whatsappOptIn,
      emailOptIn: gymMembers.emailOptIn,
      marketingOptIn: gymMembers.marketingOptIn,
    }).from(gymMembers).where(and(...conditions))
      .orderBy(gymMembers.fullName).limit(limit);

    return {
      total: rows.length,
      limit,
      members: rows.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        memberCode: m.memberCode,
        membershipStatus: m.membershipStatus,
        maskedPhone: maskPhone(m.phone),
        maskedEmail: maskEmail(m.email),
        hasWhatsapp: Boolean(normalizePhone(m.phone)),
        hasEmail: Boolean(m.email && EMAIL_RE.test(m.email)),
        whatsappOptIn: m.whatsappOptIn,
        emailOptIn: m.emailOptIn,
        marketingOptIn: m.marketingOptIn,
      })),
    };
  }

  /** Create a broadcast batch and return ephemeral send links for the owner. */
  public async previewBroadcast(
    gymId: string,
    actorUserId: string | undefined,
    input: BroadcastPreviewInput,
    ipAddress?: string
  ): Promise<any> {
    const channel: CommunicationChannel = input.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP';
    const kind: MessageKind = (['TRANSACTIONAL', 'ANNOUNCEMENT', 'PROMOTIONAL'] as const)
      .includes(input.messageKind) ? input.messageKind : 'ANNOUNCEMENT';
    const body = sanitizeMessage(input.body);
    if (!body) throw AppError.validation('Message body is required.');
    if (body.length > MAX_BODY_LENGTH) {
      throw AppError.validation(`Message body cannot exceed ${MAX_BODY_LENGTH} characters.`);
    }
    const subject = (input.subject || '').replace(CONTROL_CHARS_RE, '').trim();
    if (subject.length > MAX_SUBJECT_LENGTH) {
      throw AppError.validation(`Subject cannot exceed ${MAX_SUBJECT_LENGTH} characters.`);
    }
    if (channel === 'EMAIL' && !subject) {
      throw AppError.validation('Email subject is required.');
    }

    const settings = await this.getSettings(gymId);
    this.assertChannelPolicy(settings, channel, kind);
    const quietHoursActive = this.isQuietHours(settings);
    if (kind === 'PROMOTIONAL' && quietHoursActive) {
      throw AppError.validation('Promotional messages are blocked during configured quiet hours.');
    }

    const filter = input.audience || {};
    const limit = Math.min(MAX_RECIPIENTS, Math.max(1, Number(filter.limit) || MAX_RECIPIENTS));
    const conditions: any[] = [eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)];
    if (filter.status && filter.status !== 'ALL') {
      conditions.push(eq(gymMembers.membershipStatus, filter.status));
    }
    if (filter.memberIds?.length) {
      const ids = filter.memberIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, MAX_RECIPIENTS);
      if (!ids.length) throw AppError.validation('No valid members were selected.');
      conditions.push(inArray(gymMembers.id, ids));
    }

    const members = await db.select({
      id: gymMembers.id,
      fullName: gymMembers.fullName,
      phone: gymMembers.phone,
      email: gymMembers.email,
      whatsappOptIn: gymMembers.whatsappOptIn,
      emailOptIn: gymMembers.emailOptIn,
      marketingOptIn: gymMembers.marketingOptIn,
    }).from(gymMembers).where(and(...conditions))
      .orderBy(gymMembers.fullName).limit(limit);

    if (!members.length) throw AppError.validation('No members match the selected audience.');

    const seen = new Set<string>();
    const prepared = members.map((m) => {
      const normalized = normalizePhone(m.phone);
      const email = (m.email || '').trim().toLowerCase();
      const hasContact = channel === 'WHATSAPP' ? Boolean(normalized) : EMAIL_RE.test(email);
      const optedIn = channel === 'WHATSAPP' ? m.whatsappOptIn !== false : m.emailOptIn !== false;
      const contactKey = channel === 'WHATSAPP' ? normalized || '' : email;
      let skipReason: string | null = null;
      if (!hasContact) skipReason = 'NO_CONTACT';
      else if (!optedIn) skipReason = 'NO_CONSENT';
      else if (kind === 'PROMOTIONAL' && !m.marketingOptIn) skipReason = 'NO_MARKETING_CONSENT';
      else if (seen.has(contactKey)) skipReason = 'DUPLICATE';
      if (!skipReason) seen.add(contactKey);
      return {
        recipientId: null as string | null,
        memberId: m.id,
        fullName: m.fullName,
        contactMasked: channel === 'WHATSAPP' ? maskPhone(m.phone) : maskEmail(m.email),
        status: skipReason ? 'SKIPPED' : 'QUEUED',
        skipReason,
        actionLink: skipReason ? null : this.buildLink(channel, normalized, email, body, subject),
      };
    });

    const queued = prepared.filter((r) => r.status === 'QUEUED');
    if (!queued.length) {
      throw AppError.validation('None of the selected members can receive this message (no contact or no consent).');
    }
    const skippedCount = prepared.length - queued.length;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + BROADCAST_RETENTION_DAYS * 86400000);
    const bodySha256 = hashBody(body);

    const created: any = await db.transaction(async (tx) => {
      const [row] = await tx.insert(communicationBroadcasts).values({
        gymId,
        actorUserId: actorUserId || null,
        channel,
        messageKind: kind,
        subject: subject || null,
        bodySha256,
        bodyLength: body.length,
        recipientCount: prepared.length,
        queuedCount: queued.length,
        skippedCount,
        status: 'QUEUED',
        expiresAt,
      }).returning();

      const inserted = await tx.insert(communicationBroadcastRecipients).values(prepared.map((r) => ({
        broadcastId: row!.id,
        gymId,
        memberId: r.memberId,
        channel,
        contactMasked: r.contactMasked,
        status: r.status,
        skipReason: r.skipReason,
      }))).returning({
        id: communicationBroadcastRecipients.id,
        memberId: communicationBroadcastRecipients.memberId,
      });
      return { row, inserted };
    });

    const broadcast = created.row;
    const recipientIdByMember = new Map(
      (created.inserted as any[]).map((r) => [r.memberId, r.id])
    );
    for (const recipient of prepared) {
      recipient.recipientId = recipientIdByMember.get(recipient.memberId) || null;
    }

    await db.insert(auditLogs).values({
      gymId,
      actorType: 'OWNER',
      action: 'COMMUNICATION_BROADCAST_PREPARED',
      resource: 'communication_broadcast',
      resourceId: broadcast.id,
      ipAddress: ipAddress || null,
      metadata: JSON.stringify({
        channel, messageKind: kind, queued: queued.length,
        skipped: skippedCount, bodyLength: body.length,
        bodySha256Prefix: bodySha256.slice(0, 12),
      }),
    });

    return {
      broadcastId: broadcast.id,
      channel,
      messageKind: kind,
      subject: subject || null,
      queuedCount: queued.length,
      skippedCount,
      expiresAt: expiresAt.toISOString(),
      quietHoursActive,
      recipients: prepared,
    };
  }

  /** Re-hydrate a broadcast and rebuild links from current tenant-scoped contacts. */
  public async getBroadcast(gymId: string, broadcastId: string): Promise<any> {
    const broadcast = (
      await db.select().from(communicationBroadcasts)
        .where(and(eq(communicationBroadcasts.id, broadcastId), eq(communicationBroadcasts.gymId, gymId)))
        .limit(1)
    )[0];
    if (!broadcast) throw AppError.notFound('Broadcast not found.');

    const recipients = await db.select().from(communicationBroadcastRecipients)
      .where(and(
        eq(communicationBroadcastRecipients.broadcastId, broadcastId),
        eq(communicationBroadcastRecipients.gymId, gymId)
      ));

    const queuedIds = recipients.filter((r) => r.status === 'QUEUED').map((r) => r.memberId);
    const contacts = queuedIds.length
      ? await db.select({
          id: gymMembers.id, fullName: gymMembers.fullName,
          phone: gymMembers.phone, email: gymMembers.email,
        }).from(gymMembers)
          .where(and(eq(gymMembers.gymId, gymId), inArray(gymMembers.id, queuedIds), isNull(gymMembers.deletedAt)))
      : [];
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    const channel = broadcast.channel as CommunicationChannel;

    return {
      broadcastId: broadcast.id,
      channel,
      messageKind: broadcast.messageKind,
      subject: broadcast.subject,
      status: broadcast.status,
      recipientCount: broadcast.recipientCount,
      queuedCount: broadcast.queuedCount,
      sentCount: broadcast.sentCount,
      failedCount: broadcast.failedCount,
      skippedCount: broadcast.skippedCount,
      createdAt: new Date(broadcast.createdAt).toISOString(),
      expiresAt: new Date(broadcast.expiresAt).toISOString(),
      bodyUnavailable: true,
      recipients: recipients.map((r) => ({
        recipientId: r.id,
        memberId: r.memberId,
        fullName: contactMap.get(r.memberId)?.fullName || null,
        contactMasked: r.contactMasked,
        status: r.status,
        skipReason: r.skipReason,
      })),
    };
  }

  /** Record per-recipient delivery outcomes reported by the owner UI. */
  public async updateProgress(
    gymId: string,
    broadcastId: string,
    updates: RecipientProgressInput[],
    actorUserId?: string
  ): Promise<any> {
    if (!Array.isArray(updates) || !updates.length) {
      throw AppError.validation('At least one recipient status update is required.');
    }
    if (updates.length > MAX_RECIPIENTS) {
      throw AppError.validation(`Cannot update more than ${MAX_RECIPIENTS} recipients at once.`);
    }
    const allowed = new Set(['SENT', 'FAILED', 'SKIPPED']);
    for (const u of updates) {
      if (!/^[0-9a-f-]{36}$/i.test(u.recipientId) || !allowed.has(u.status)) {
        throw AppError.validation('Invalid recipient update payload.');
      }
    }

    const exists = await db.select({ id: communicationBroadcasts.id })
      .from(communicationBroadcasts)
      .where(and(eq(communicationBroadcasts.id, broadcastId), eq(communicationBroadcasts.gymId, gymId)))
      .limit(1);
    if (!exists.length) throw AppError.notFound('Broadcast not found.');

    const summary = await db.transaction(async (tx) => {
      const now = new Date();
      for (const update of updates) {
        await tx.update(communicationBroadcastRecipients)
          .set({
            status: update.status,
            sentAt: update.status === 'SENT' ? now : null,
            updatedAt: now,
          })
          .where(and(
            eq(communicationBroadcastRecipients.id, update.recipientId),
            eq(communicationBroadcastRecipients.broadcastId, broadcastId),
            eq(communicationBroadcastRecipients.gymId, gymId),
            eq(communicationBroadcastRecipients.status, 'QUEUED')
          ));
      }

      const grouped = await tx.select({
        status: communicationBroadcastRecipients.status,
        count: sql<number>`count(*)::int`,
      }).from(communicationBroadcastRecipients)
        .where(eq(communicationBroadcastRecipients.broadcastId, broadcastId))
        .groupBy(communicationBroadcastRecipients.status);

      const counts: Record<string, number> = {};
      for (const g of grouped) counts[g.status] = Number(g.count);
      const queued = counts.QUEUED || 0;
      const sent = counts.SENT || 0;
      const failed = counts.FAILED || 0;
      const skipped = counts.SKIPPED || 0;

      await tx.update(communicationBroadcasts).set({
        queuedCount: queued,
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
        status: queued === 0 ? 'COMPLETED' : 'QUEUED',
        completedAt: queued === 0 ? now : null,
        updatedAt: now,
      }).where(and(
        eq(communicationBroadcasts.id, broadcastId),
        eq(communicationBroadcasts.gymId, gymId)
      ));

      return { queuedCount: queued, sentCount: sent, failedCount: failed, skippedCount: skipped };
    });

    await db.insert(auditLogs).values({
      gymId,
      actorType: 'OWNER',
      action: 'COMMUNICATION_BROADCAST_PROGRESS_RECORDED',
      resource: 'communication_broadcast',
      resourceId: broadcastId,
      metadata: JSON.stringify({ actorUserId: actorUserId || null, updated: updates.length, ...summary }),
    });

    return { broadcastId, ...summary };
  }

  /** Cancel a pending broadcast and mark all queued recipients as skipped. */
  public async cancelBroadcast(gymId: string, broadcastId: string, actorUserId?: string): Promise<any> {
    const now = new Date();
    const [updated] = await db.update(communicationBroadcasts)
      .set({ status: 'CANCELLED', completedAt: now, updatedAt: now })
      .where(and(eq(communicationBroadcasts.id, broadcastId), eq(communicationBroadcasts.gymId, gymId)))
      .returning({ id: communicationBroadcasts.id });
    if (!updated) throw AppError.notFound('Broadcast not found.');

    await db.update(communicationBroadcastRecipients)
      .set({ status: 'SKIPPED', skipReason: 'CANCELLED', updatedAt: now })
      .where(and(
        eq(communicationBroadcastRecipients.broadcastId, broadcastId),
        eq(communicationBroadcastRecipients.gymId, gymId),
        eq(communicationBroadcastRecipients.status, 'QUEUED')
      ));

    await db.insert(auditLogs).values({
      gymId, actorType: 'OWNER', action: 'COMMUNICATION_BROADCAST_CANCELLED',
      resource: 'communication_broadcast', resourceId: broadcastId,
      metadata: JSON.stringify({ actorUserId: actorUserId || null }),
    });
    return { broadcastId, status: 'CANCELLED' };
  }

  /** Retention: physically purge broadcast audit rows after their TTL. */
  public async purgeExpired(): Promise<{ purged: number }> {
    const rows = await db.delete(communicationBroadcasts)
      .where(sql`${communicationBroadcasts.expiresAt} < NOW()`)
      .returning({ id: communicationBroadcasts.id });
    return { purged: rows.length };
  }

  private assertChannelPolicy(settings: any, channel: CommunicationChannel, kind: MessageKind): void {
    if (channel === 'WHATSAPP') {
      if (!settings.whatsappForMembers) throw AppError.forbidden('WhatsApp channel is disabled for members.');
      if (kind === 'PROMOTIONAL' && !settings.whatsappPromosAllowed) {
        throw AppError.forbidden('Promotional WhatsApp messages are disabled in settings.');
      }
      if (kind === 'TRANSACTIONAL' && !(settings.whatsappReceiptsAllowed || settings.whatsappRemindersAllowed)) {
        throw AppError.forbidden('Transactional WhatsApp messages are disabled in settings.');
      }
      if (kind === 'ANNOUNCEMENT' && !(settings.whatsappSupportAllowed || settings.whatsappPromosAllowed)) {
        throw AppError.forbidden('Announcement WhatsApp messages are disabled in settings.');
      }
      return;
    }
    if (!settings.emailForMembers) throw AppError.forbidden('Email channel is disabled for members.');
    if (kind === 'PROMOTIONAL' && !settings.emailNewsletterAllowed) {
      throw AppError.forbidden('Promotional email messages are disabled in settings.');
    }
    if (kind === 'TRANSACTIONAL' && !(settings.emailInvoicesAllowed || settings.emailAlertsAllowed)) {
      throw AppError.forbidden('Transactional email messages are disabled in settings.');
    }
    if (kind === 'ANNOUNCEMENT' && !settings.emailAlertsAllowed) {
      throw AppError.forbidden('Announcement email messages are disabled in settings.');
    }
  }

  private isQuietHours(settings: any): boolean {
    const start = this.toMinutes(settings.quietHoursStart);
    const end = this.toMinutes(settings.quietHoursEnd);
    if (start === null || end === null || start === end) return false;
    let nowMinutes: number;
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: process.env.COMMUNICATION_TIMEZONE || 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date());
      nowMinutes = Number(parts.find((p) => p.type === 'hour')?.value || 0) * 60
        + Number(parts.find((p) => p.type === 'minute')?.value || 0);
    } catch {
      const now = new Date();
      nowMinutes = now.getHours() * 60 + now.getMinutes();
    }
    return start < end
      ? nowMinutes >= start && nowMinutes < end
      : nowMinutes >= start || nowMinutes < end;
  }

  private toMinutes(value: string | null): number | null {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  }

  private buildLink(
    channel: CommunicationChannel,
    phone: string | null,
    email: string,
    body: string,
    subject: string
  ): string | null {
    if (channel === 'WHATSAPP') {
      if (!phone) return null;
      return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
    }
    if (!EMAIL_RE.test(email)) return null;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

export const communicationService = new CommunicationService();
export default communicationService;
