/**
 * GymDeck WhatsApp - owner-configurable automatic utility reminders.
 *
 * Scheduling lives on the central backend, so reminders continue while the
 * owner's desktop app is closed. Every rule is disabled by default; enabling a
 * rule is an explicit owner action.
 *
 * Duplicate reminders are impossible by construction: each generated job
 * carries a unique `dedupeKey` of rule + member + local date, and the database
 * enforces uniqueness on (gym_id, dedupe_key).
 */

import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  whatsappAutomationRules,
  whatsappMessageJobs,
  gymMembers,
  memberMemberships,
  payments,
  ptSessions,
  attendanceLogs,
  gyms,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logging';
import { whatsappAccountService } from './accountService';
import { templateService } from './templateService';
import { whatsappConsentService } from './consentService';
import { whatsappCustomerWindowService } from './customerWindowService';
import { memberContextService } from './memberContext';
import type { MemberContext } from './memberContext';
import { getUtilityTemplate, type UtilityIntent } from './templates';
import { renderWhatsAppMessage } from './variables';
import { evaluateDelivery } from './policy';
import { sha256 } from './signature';
import { recordWhatsAppAudit } from './audit';

export const AUTOMATION_RULE_TYPES = [
  'MEMBERSHIP_EXPIRY',
  'PAYMENT_DUE',
  'PAYMENT_RECEIVED',
  'MEMBERSHIP_WELCOME',
  'CLASS_SCHEDULE',
  'MEMBERSHIP_RENEWAL',
  'ATTENDANCE',
] as const;

export type AutomationRuleType = (typeof AUTOMATION_RULE_TYPES)[number];

export interface AutomationRuleInput {
  ruleType: string;
  offsetDays: number;
  sendTime: string;
  isEnabled: boolean;
  templateId?: string | null;
}

const RULE_INTENT: Record<AutomationRuleType, UtilityIntent> = {
  MEMBERSHIP_EXPIRY: 'MEMBERSHIP_EXPIRY',
  PAYMENT_DUE: 'PAYMENT_DUE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  MEMBERSHIP_WELCOME: 'MEMBERSHIP_WELCOME',
  CLASS_SCHEDULE: 'CLASS_SCHEDULE',
  MEMBERSHIP_RENEWAL: 'MEMBERSHIP_RENEWAL',
  ATTENDANCE: 'ATTENDANCE',
};

const RULE_LABEL: Record<AutomationRuleType, string> = {
  MEMBERSHIP_EXPIRY: 'Membership expiry reminder',
  PAYMENT_DUE: 'Payment due reminder',
  PAYMENT_RECEIVED: 'Payment confirmation',
  MEMBERSHIP_WELCOME: 'New member welcome',
  CLASS_SCHEDULE: 'Class schedule reminder',
  MEMBERSHIP_RENEWAL: 'Membership renewal confirmation',
  ATTENDANCE: 'Attendance confirmation',
};

const DEFAULT_RULES: Array<{ ruleType: AutomationRuleType; offsetDays: number; sendTime: string }> = [
  { ruleType: 'MEMBERSHIP_EXPIRY', offsetDays: 7, sendTime: '10:00' },
  { ruleType: 'MEMBERSHIP_EXPIRY', offsetDays: 3, sendTime: '10:00' },
  { ruleType: 'MEMBERSHIP_EXPIRY', offsetDays: 1, sendTime: '10:00' },
  { ruleType: 'MEMBERSHIP_EXPIRY', offsetDays: 0, sendTime: '10:00' },
  { ruleType: 'PAYMENT_DUE', offsetDays: 3, sendTime: '10:00' },
  { ruleType: 'PAYMENT_DUE', offsetDays: 0, sendTime: '10:00' },
  { ruleType: 'PAYMENT_DUE', offsetDays: -3, sendTime: '10:00' },
  { ruleType: 'PAYMENT_RECEIVED', offsetDays: 0, sendTime: '10:00' },
  { ruleType: 'MEMBERSHIP_WELCOME', offsetDays: 0, sendTime: '10:00' },
  { ruleType: 'CLASS_SCHEDULE', offsetDays: 0, sendTime: '08:00' },
  { ruleType: 'MEMBERSHIP_RENEWAL', offsetDays: 0, sendTime: '10:00' },
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDayKey(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(
    ist.getUTCDate()
  ).padStart(2, '0')}`;
}

function istMinutes(date: Date): number {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

function istStartOfDay(date: Date): Date {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const startIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(startIst - IST_OFFSET_MS);
}

export class WhatsAppAutomationService {
  public async listRules(gymId: string): Promise<any[]> {
    for (const rule of DEFAULT_RULES) {
      await db
        .insert(whatsappAutomationRules)
        .values({
          gymId,
          ruleType: rule.ruleType,
          offsetDays: rule.offsetDays,
          sendTime: rule.sendTime,
          isEnabled: false,
        })
        .onConflictDoNothing();
    }

    const rows = await db
      .select()
      .from(whatsappAutomationRules)
      .where(eq(whatsappAutomationRules.gymId, gymId))
      .orderBy(
        whatsappAutomationRules.ruleType,
        whatsappAutomationRules.offsetDays
      );

    return rows
      .map((row) => ({
        id: row.id,
        ruleType: row.ruleType,
        label: RULE_LABEL[row.ruleType as AutomationRuleType] || row.ruleType,
        offsetDays: row.offsetDays,
        sendTime: row.sendTime,
        isEnabled: row.isEnabled,
        templateId: row.templateId,
        lastRunAt: row.lastRunAt ? new Date(row.lastRunAt).toISOString() : null,
      }))
      .sort((a, b) => a.ruleType.localeCompare(b.ruleType) || b.offsetDays - a.offsetDays);
  }

  public async saveRules(
    gymId: string,
    rules: AutomationRuleInput[],
    actorUserId?: string
  ): Promise<any[]> {
    if (!Array.isArray(rules) || rules.length === 0) {
      throw AppError.validation('At least one automation rule is required.');
    }
    if (rules.length > 40) throw AppError.validation('Too many automation rules.');

    for (const rule of rules) {
      if (!AUTOMATION_RULE_TYPES.includes(rule.ruleType as AutomationRuleType)) {
        throw AppError.validation(`Unsupported automation rule: ${rule.ruleType}`);
      }
      if (!Number.isInteger(rule.offsetDays) || rule.offsetDays < -30 || rule.offsetDays > 90) {
        throw AppError.validation('Automation offset must be between -30 and 90 days.');
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.sendTime)) {
        throw AppError.validation('Automation send time must be a valid HH:MM value.');
      }
      if (rule.templateId) {
        const template = await templateService.findById(gymId, rule.templateId);
        if (!template) throw AppError.validation('Selected template does not belong to this gym.');
      }
    }

    for (const rule of rules) {
      await db
        .insert(whatsappAutomationRules)
        .values({
          gymId,
          ruleType: rule.ruleType,
          offsetDays: rule.offsetDays,
          sendTime: rule.sendTime,
          isEnabled: Boolean(rule.isEnabled),
          templateId: rule.templateId ?? null,
        })
        .onConflictDoUpdate({
          target: [
            whatsappAutomationRules.gymId,
            whatsappAutomationRules.ruleType,
            whatsappAutomationRules.offsetDays,
          ],
          set: {
            sendTime: rule.sendTime,
            isEnabled: Boolean(rule.isEnabled),
            templateId: rule.templateId ?? null,
            updatedAt: new Date(),
          },
        });
    }

    await recordWhatsAppAudit({
      gymId,
      actorId: actorUserId,
      action: 'WHATSAPP_AUTOMATION_UPDATED',
      metadata: { rules: rules.length, enabled: rules.filter((rule) => rule.isEnabled).length },
    });

    return this.listRules(gymId);
  }

  /** Called by the background worker; scans all gyms with enabled rules. */
  public async runDueRules(now: Date = new Date()): Promise<{ gyms: number; queued: number }> {
    const rules = await db
      .select()
      .from(whatsappAutomationRules)
      .where(eq(whatsappAutomationRules.isEnabled, true));

    let queued = 0;
    const gymsTouched = new Set<string>();

    for (const rule of rules) {
      if (!this.isRuleDue(rule, now)) continue;

      try {
        const created = await this.executeRule(rule, now);
        queued += created;
        gymsTouched.add(rule.gymId);
      } catch (err) {
        logger.warn('[whatsapp-automation] rule execution failed', {
          gymId: rule.gymId,
          ruleType: rule.ruleType,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }

      await db
        .update(whatsappAutomationRules)
        .set({ lastRunAt: now, updatedAt: now })
        .where(
          and(
            eq(whatsappAutomationRules.id, rule.id),
            eq(whatsappAutomationRules.gymId, rule.gymId)
          )
        );
    }

    return { gyms: gymsTouched.size, queued };
  }

  private isRuleDue(rule: any, now: Date): boolean {
    const [hour, minute] = String(rule.sendTime || '10:00').split(':').map(Number);
    const dueMinutes = (hour ?? 10) * 60 + (minute ?? 0);
    if (istMinutes(now) < dueMinutes) return false;

    const startOfDay = istStartOfDay(now);
    const dueAt = new Date(startOfDay.getTime() + dueMinutes * 60 * 1000);
    if (!rule.lastRunAt) return true;
    return new Date(rule.lastRunAt).getTime() < dueAt.getTime();
  }

  private async executeRule(rule: any, now: Date): Promise<number> {
    const gymId = rule.gymId;
    const ruleType = rule.ruleType as AutomationRuleType;
    const intent = RULE_INTENT[ruleType];
    if (!intent) return 0;

    const account = await whatsappAccountService.getAccount(gymId);
    if (
      !account ||
      (account.connectionStatus !== 'CONNECTED' &&
        account.connectionStatus !== 'SANDBOX' &&
        account.connectionStatus !== 'DEVELOPMENT')
    ) {
      return 0;
    }

    const definition = getUtilityTemplate(intent);
    if (!definition) return 0;

    const template = rule.templateId
      ? await templateService.findById(gymId, rule.templateId)
      : await templateService.findUsableForIntent(gymId, intent);

    const templateUsable = template?.approvalStatus === 'APPROVED' && template.category === 'UTILITY';
    if (!templateUsable && account.connectionStatus !== 'SANDBOX') {
      // No approved template: do not substitute free text outside the window.
      return 0;
    }

    const targets = await this.selectTargets(gymId, ruleType, rule.offsetDays, now);
    if (!targets.length) return 0;

    const gymRows = await db
      .select({ name: gyms.name })
      .from(gyms)
      .where(eq(gyms.id, gymId))
      .limit(1);
    const gymName = gymRows[0]?.name || 'your gym';

    const consents = await whatsappConsentService.getMany(
      gymId,
      targets.map((member) => member.id)
    );
    const windows = await whatsappCustomerWindowService.getMany(
      gymId,
      targets.map((member) => member.id),
      account.id
    );

    const ruleTemplateKeys: string[] = (() => {
      try {
        const parsed = template?.variableKeys ? JSON.parse(template.variableKeys) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    const dayKey = istDayKey(now);
    let created = 0;

    for (const member of targets) {
      const consent = consents.get(member.id);
      const windowOpen = Boolean(windows.get(member.id));

      const evaluation = evaluateDelivery({
        accountStatus: account.connectionStatus,
        hasValidPhone: Boolean(member.normalizedPhone),
        consentStatus: consent?.status ?? null,
        messageKind: 'UTILITY',
        windowOpen,
        template: template
          ? { approvalStatus: template.approvalStatus, category: template.category }
          : null,
      });
      if (!evaluation.allowed) continue;

      const values = memberContextService.buildVariableValues(member, {
        gymName,
        paymentAmount: member.latestPaymentAmount,
      });
      const rendered = renderWhatsAppMessage(definition.body, values);
      if (rendered.missingVariables.length || rendered.unknownVariables.length) continue;

      const parameters = ruleTemplateKeys.map((key) => {
        const value = (values as Record<string, string | undefined>)[key];
        return value || '';
      });
      if (evaluation.mode === 'TEMPLATE' && parameters.some((value) => !value)) continue;

      const payload =
        evaluation.mode === 'TEXT'
          ? { type: 'TEXT', body: rendered.text }
          : {
              type: 'TEMPLATE',
              templateName: template?.templateName || definition.templateName,
              language: template?.language || definition.language,
              parameters,
              preview: rendered.text,
            };

      const dedupeKey = `automation:${ruleType}:${rule.offsetDays}:${member.id}:${dayKey}`;
      const idempotencyKey = sha256(`whatsapp-automation:${gymId}:${dedupeKey}`);

      try {
        const inserted = await db
          .insert(whatsappMessageJobs)
          .values({
            gymId,
            batchId: null,
            memberId: member.id,
            senderAccountId: account.id,
            recipientNumber: member.normalizedPhone || '',
            recipientName: member.fullName,
            messageType: evaluation.mode,
            environment:
              account.connectionStatus === 'DEVELOPMENT' ? 'DEVELOPMENT' : 'PRODUCTION',
            templateId: evaluation.mode === 'TEMPLATE' ? template?.id ?? null : null,
            messagePayload: JSON.stringify(payload),
            renderedPreview: rendered.text,
            idempotencyKey,
            dedupeKey,
            deliveryStatus: 'QUEUED',
            scheduledAt: now,
            nextAttemptAt: now,
            createdBy: null,
          })
          .onConflictDoNothing()
          .returning({ id: whatsappMessageJobs.id });

        if (inserted.length) created += 1;
      } catch (err: any) {
        if (err?.code !== '23505') throw err;
      }
    }

    if (created > 0) {
      await recordWhatsAppAudit({
        gymId,
        action: 'WHATSAPP_AUTOMATION_ENQUEUED',
        targetId: rule.id,
        metadata: { ruleType, offsetDays: rule.offsetDays, created },
      });
    }

    return created;
  }

  private async selectTargets(
    gymId: string,
    ruleType: AutomationRuleType,
    offsetDays: number,
    now: Date
  ): Promise<MemberContext[]> {
    const memberIds = await this.selectTargetIds(gymId, ruleType, offsetDays, now);
    if (!memberIds.length) return [];
    return memberContextService.loadByIds(gymId, memberIds);
  }

  private async selectTargetIds(
    gymId: string,
    ruleType: AutomationRuleType,
    offsetDays: number,
    now: Date
  ): Promise<string[]> {
    const dayStart = istStartOfDay(now);

    switch (ruleType) {
      case 'MEMBERSHIP_EXPIRY':
      case 'PAYMENT_DUE': {
        const targetStart = new Date(dayStart.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        const targetEnd = new Date(targetStart.getTime() + 24 * 60 * 60 * 1000);

        if (ruleType === 'PAYMENT_DUE') {
          const pending = await db
            .select({ memberId: payments.memberId })
            .from(payments)
            .where(and(eq(payments.gymId, gymId), eq(payments.status, 'PENDING')));
          const pendingIds = new Set(pending.map((row) => row.memberId));
          if (!pendingIds.size) return [];

          // Prefer the membership's real end date, then the member mirror.
          const memberships = await db
            .select({ memberId: memberMemberships.memberId, endDate: memberMemberships.endDate })
            .from(memberMemberships)
            .where(
              and(
                eq(memberMemberships.gymId, gymId),
                gte(memberMemberships.endDate, targetStart),
                lte(memberMemberships.endDate, targetEnd)
              )
            );
          const membershipIds = new Set(memberships.map((row) => row.memberId));

          const members = await db
            .select({ id: gymMembers.id, expiresAt: gymMembers.expiresAt })
            .from(gymMembers)
            .where(
              and(
                eq(gymMembers.gymId, gymId),
                gte(gymMembers.expiresAt, targetStart),
                lte(gymMembers.expiresAt, targetEnd)
              )
            );
          const mirrorIds = new Set(members.map((row) => row.id));

          return [...pendingIds].filter((id) => membershipIds.has(id) || mirrorIds.has(id));
        }

        const members = await db
          .select({ id: gymMembers.id })
          .from(gymMembers)
          .where(
            and(
              eq(gymMembers.gymId, gymId),
              sql`${gymMembers.deletedAt} IS NULL`,
              gte(gymMembers.expiresAt, targetStart),
              lte(gymMembers.expiresAt, targetEnd)
            )
          );
        return members.map((row) => row.id);
      }

      case 'MEMBERSHIP_WELCOME': {
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const members = await db
          .select({ id: gymMembers.id })
          .from(gymMembers)
          .where(
            and(
              eq(gymMembers.gymId, gymId),
              sql`${gymMembers.deletedAt} IS NULL`,
              gte(gymMembers.joinedAt, since)
            )
          );
        return members.map((row) => row.id);
      }

      case 'PAYMENT_RECEIVED': {
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const rows = await db
          .select({ memberId: payments.memberId })
          .from(payments)
          .where(
            and(
              eq(payments.gymId, gymId),
              eq(payments.status, 'COMPLETED'),
              gte(payments.paidAt, since)
            )
          );
        return [...new Set(rows.map((row) => row.memberId))];
      }

      case 'MEMBERSHIP_RENEWAL': {
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const rows = await db
          .select({ memberId: memberMemberships.memberId })
          .from(memberMemberships)
          .where(
            and(
              eq(memberMemberships.gymId, gymId),
              eq(memberMemberships.status, 'ACTIVE'),
              gte(memberMemberships.startDate, since)
            )
          );
        return [...new Set(rows.map((row) => row.memberId))];
      }

      case 'CLASS_SCHEDULE': {
        const horizon = new Date(now.getTime() + Math.max(0, offsetDays) * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
        const rows = await db
          .select({ memberId: ptSessions.memberId })
          .from(ptSessions)
          .where(
            and(
              eq(ptSessions.gymId, gymId),
              gte(ptSessions.sessionDate, now),
              lte(ptSessions.sessionDate, horizon)
            )
          );
        return [...new Set(rows.map((row) => row.memberId))];
      }

      case 'ATTENDANCE': {
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const rows = await db
          .select({ memberId: attendanceLogs.memberId })
          .from(attendanceLogs)
          .where(
            and(eq(attendanceLogs.gymId, gymId), gte(attendanceLogs.checkInTime, since))
          );
        return [...new Set(rows.map((row) => row.memberId))];
      }

      default:
        return [];
    }
  }

  /** Manual run for one gym (owner "run now" is intentionally absent; testing hook). */
  public async runGymNow(gymId: string, now: Date = new Date()): Promise<{ queued: number }> {
    const rules = await db
      .select()
      .from(whatsappAutomationRules)
      .where(
        and(
          eq(whatsappAutomationRules.gymId, gymId),
          eq(whatsappAutomationRules.isEnabled, true)
        )
      );

    let queued = 0;
    for (const rule of rules) {
      queued += await this.executeRule(rule, now);
    }
    return { queued };
  }

  public async countEnabledRules(gymId: string): Promise<number> {
    const rows = await db
      .select({ id: whatsappAutomationRules.id })
      .from(whatsappAutomationRules)
      .where(
        and(
          eq(whatsappAutomationRules.gymId, gymId),
          eq(whatsappAutomationRules.isEnabled, true)
        )
      );
    return rows.length;
  }
}

export const whatsappAutomationService = new WhatsAppAutomationService();
export default whatsappAutomationService;
