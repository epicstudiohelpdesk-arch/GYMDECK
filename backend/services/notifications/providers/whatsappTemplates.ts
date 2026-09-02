/**
 * GymDeck Notification Core - WhatsApp Message Templates & Payload Formatter
 */

export interface WhatsAppTemplateDefinition {
  templateName: string;
  languageCode: string;
  bodyParameterKeys: string[];
}

export const APPROVED_WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplateDefinition> = {
  MEMBERSHIP_ACTIVATED: {
    templateName: 'gd_membership_activated',
    languageCode: 'en_US',
    bodyParameterKeys: ['planName', 'endDate'],
  },
  MEMBERSHIP_RENEWED: {
    templateName: 'gd_membership_renewed',
    languageCode: 'en_US',
    bodyParameterKeys: ['planName', 'endDate'],
  },
  MEMBERSHIP_FROZEN: {
    templateName: 'gd_membership_frozen',
    languageCode: 'en_US',
    bodyParameterKeys: ['frozenDaysRemaining', 'reason'],
  },
  MEMBERSHIP_UNFROZEN: {
    templateName: 'gd_membership_unfrozen',
    languageCode: 'en_US',
    bodyParameterKeys: ['newEndDate'],
  },
  PAYMENT_RECEIVED: {
    templateName: 'gd_payment_received',
    languageCode: 'en_US',
    bodyParameterKeys: ['amount', 'receiptNumber'],
  },
  PAYMENT_REFUNDED: {
    templateName: 'gd_payment_refunded',
    languageCode: 'en_US',
    bodyParameterKeys: ['refundAmount'],
  },
  ATTENDANCE_CHECKED_IN: {
    templateName: 'gd_attendance_checkin',
    languageCode: 'en_US',
    bodyParameterKeys: ['checkInTime'],
  },
  TRAINER_ASSIGNED: {
    templateName: 'gd_trainer_assigned',
    languageCode: 'en_US',
    bodyParameterKeys: ['trainerName'],
  },
  PT_PACKAGE_PURCHASED: {
    templateName: 'gd_pt_package_purchased',
    languageCode: 'en_US',
    bodyParameterKeys: ['totalSessions', 'trainerName'],
  },
  PT_SESSION_COMPLETED: {
    templateName: 'gd_pt_session_completed',
    languageCode: 'en_US',
    bodyParameterKeys: ['focusArea', 'remainingSessions'],
  },
  PT_SESSION_CANCELLED: {
    templateName: 'gd_pt_session_cancelled',
    languageCode: 'en_US',
    bodyParameterKeys: ['sessionDate', 'reason'],
  },
  SYSTEM_ALERT: {
    templateName: 'gd_system_alert',
    languageCode: 'en_US',
    bodyParameterKeys: ['title', 'body'],
  },
};

/**
 * Normalize phone number to international E.164 format without '+' or special characters
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digitsOnly = rawPhone.replace(/\D/g, '');
  return digitsOnly;
}

/**
 * Resolve approved template configuration and populate parameters from notification payload
 */
export function resolveWhatsAppTemplate(
  notificationType: string,
  title: string,
  body: string,
  payload: Record<string, any> | null
): {
  templateName: string;
  languageCode: string;
  parameters: Array<{ type: 'text'; text: string }>;
} {
  const definition = APPROVED_WHATSAPP_TEMPLATES[notificationType] || APPROVED_WHATSAPP_TEMPLATES.SYSTEM_ALERT!;
  const mergedData: Record<string, string> = {
    title,
    body,
    ...(payload || {}),
  };

  const parameters = definition.bodyParameterKeys.map((key) => ({
    type: 'text' as const,
    text: String(mergedData[key] ?? 'N/A').substring(0, 120),
  }));

  return {
    templateName: definition.templateName,
    languageCode: definition.languageCode,
    parameters,
  };
}
