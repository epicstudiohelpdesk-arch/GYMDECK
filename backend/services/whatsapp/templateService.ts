/**
 * GymDeck WhatsApp - utility template lifecycle.
 *
 * OpenWA has no template review. GymDeck seeds local utility definitions and
 * renders them to plain text at send time; no Meta approval or WABA is used.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gymWhatsAppTemplates,
  whatsappMessageJobs,
} from '../../shared/database/schema';
import {
  UTILITY_TEMPLATES,
  buildTemplateComponents,
  getUtilityTemplate,
  getUtilityTemplateByName,
} from './templates';
import { extractVariableNames } from './variables';

export interface TemplateView {
  id: string;
  templateName: string;
  intent: string;
  label: string;
  category: string;
  language: string;
  approvalStatus: string;
  rejectionReason: string | null;
  variables: string[];
  body: string;
  isUsable: boolean;
  templateVersion: number;
}

const INTENT_BY_NAME = new Map(
  UTILITY_TEMPLATES.map((definition) => [definition.templateName, definition.intent])
);

export class WhatsAppTemplateService {
  /** Idempotently install the built-in utility definitions for a gym. */
  public async seedDefaults(gymId: string): Promise<void> {
    for (const definition of UTILITY_TEMPLATES) {
      const variableKeys = extractVariableNames(definition.body);
      await db
        .insert(gymWhatsAppTemplates)
        .values({
          gymId,
          templateName: definition.templateName,
          category: definition.category,
          language: definition.language,
          // OpenWA has no Meta template review. Saved GymDeck templates are
          // ready to render immediately; the recipient receives plain text.
          approvalStatus: 'APPROVED',
          templateComponents: JSON.stringify(buildTemplateComponents(definition)),
          variableKeys: JSON.stringify(variableKeys),
          isBuiltin: true,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [
            gymWhatsAppTemplates.gymId,
            gymWhatsAppTemplates.templateName,
            gymWhatsAppTemplates.language,
          ],
          set: {
            approvalStatus: 'APPROVED',
            isActive: true,
            variableKeys: JSON.stringify(variableKeys),
            templateComponents: JSON.stringify(buildTemplateComponents(definition)),
            updatedAt: new Date(),
          },
        });
    }
  }

  public async list(gymId: string): Promise<TemplateView[]> {
    await this.seedDefaults(gymId);

    const rows = await db
      .select()
      .from(gymWhatsAppTemplates)
      .where(eq(gymWhatsAppTemplates.gymId, gymId))
      .orderBy(gymWhatsAppTemplates.templateName);

    return rows.map((row) => this.toView(row));
  }

  private toView(row: any): TemplateView {
    const definition = getUtilityTemplateByName(row.templateName);
    const intent = definition?.intent ?? INTENT_BY_NAME.get(row.templateName) ?? 'SERVICE_ANNOUNCEMENT';
    let variables: string[] = [];
    try {
      variables = row.variableKeys ? JSON.parse(row.variableKeys) : [];
    } catch {
      variables = [];
    }

    return {
      id: row.id,
      templateName: row.templateName,
      intent,
      label: definition?.label || row.templateName,
      category: row.category,
      language: row.language,
      approvalStatus: row.approvalStatus,
      rejectionReason: row.rejectionReason || null,
      variables,
      body: definition?.body || '',
      isUsable: Boolean(row.isActive) && row.category === 'UTILITY',
      templateVersion: row.templateVersion,
    };
  }

  /** The single template that may be used for a given intent right now. */
  public async findUsableForIntent(gymId: string, intent: string): Promise<any | null> {
    const definition = getUtilityTemplate(intent);
    if (!definition) return null;

    const rows = await db
      .select()
      .from(gymWhatsAppTemplates)
      .where(
        and(
          eq(gymWhatsAppTemplates.gymId, gymId),
          eq(gymWhatsAppTemplates.templateName, definition.templateName),
          eq(gymWhatsAppTemplates.language, definition.language)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return row.isActive && row.category === 'UTILITY' ? row : null;
  }

  public async findById(gymId: string, templateId: string): Promise<any | null> {
    const rows = await db
      .select()
      .from(gymWhatsAppTemplates)
      .where(
        and(
          eq(gymWhatsAppTemplates.id, templateId),
          eq(gymWhatsAppTemplates.gymId, gymId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Count of approved utility templates for the gym (used in overview). */
  public async countApproved(gymId: string): Promise<number> {
    const rows = await db
      .select({ id: gymWhatsAppTemplates.id })
      .from(gymWhatsAppTemplates)
      .where(
        and(
          eq(gymWhatsAppTemplates.gymId, gymId),
          eq(gymWhatsAppTemplates.approvalStatus, 'APPROVED')
        )
      );
    return rows.length;
  }

  /** Usage summary for the billing transparency panel. */
  public async usage(gymId: string, days = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        deliveryStatus: whatsappMessageJobs.deliveryStatus,
        messageType: whatsappMessageJobs.messageType,
      })
      .from(whatsappMessageJobs)
      .where(eq(whatsappMessageJobs.gymId, gymId));

    const recent = rows.filter((row) => row.deliveryStatus !== 'DRAFT');
    const counts: Record<string, number> = {};
    for (const row of recent) {
      counts[row.deliveryStatus] = (counts[row.deliveryStatus] || 0) + 1;
    }

    return {
      periodDays: days,
      since: since.toISOString(),
      submitted: recent.length,
      accepted: counts.ACCEPTED || 0,
      sent: counts.SENT || 0,
      delivered: counts.DELIVERED || 0,
      read: counts.READ || 0,
      failed: counts.FAILED || 0,
      rejected: counts.REJECTED || 0,
      queued: counts.QUEUED || 0,
      estimatedCharges: null,
      billingNote:
        'Messages are sent through the gym\'s linked WhatsApp account and OpenWA. GymDeck charges no per-message fee and does not invent Meta pricing.',
    };
  }
}

export const templateService = new WhatsAppTemplateService();
export default templateService;
