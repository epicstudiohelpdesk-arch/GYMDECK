/**
 * GymDeck WhatsApp - Utility template catalogue.
 *
 * Only transactional utility templates are declared here. GymDeck does not
 * implement promotional/marketing broadcasts, and no entry may be reclassified
 * as UTILITY to dodge Meta's marketing rules.
 *
 * IMPORTANT: these definitions are what GymDeck *submits* for approval. They
 * are not approval. A template is usable only when Meta reports APPROVED.
 */

import { extractVariableNames } from './variables';

export type UtilityIntent =
  | 'MEMBERSHIP_EXPIRY'
  | 'PAYMENT_DUE'
  | 'PAYMENT_RECEIVED'
  | 'MEMBERSHIP_RENEWAL'
  | 'CLASS_SCHEDULE'
  | 'MEMBERSHIP_WELCOME'
  | 'ATTENDANCE'
  | 'SERVICE_ANNOUNCEMENT';

export interface UtilityTemplateDefinition {
  intent: UtilityIntent;
  templateName: string;
  language: string;
  category: 'UTILITY';
  label: string;
  description: string;
  body: string;
}

export const UTILITY_TEMPLATES: UtilityTemplateDefinition[] = [
  {
    intent: 'MEMBERSHIP_EXPIRY',
    templateName: 'gd_membership_expiring',
    language: 'en',
    category: 'UTILITY',
    label: 'Membership expiring',
    description: 'Reminder before or on the membership expiry date.',
    body:
      'Hi {{member_name}}, your {{membership_plan}} membership at {{gym_name}} expires on {{membership_expiry}}. Please renew to keep your access.',
  },
  {
    intent: 'PAYMENT_DUE',
    templateName: 'gd_payment_due',
    language: 'en',
    category: 'UTILITY',
    label: 'Payment due',
    description: 'Payment reminder for an outstanding membership balance.',
    body:
      'Hi {{member_name}}, a payment of {{payment_amount}} for your {{membership_plan}} membership at {{gym_name}} is due on {{payment_due_date}}.',
  },
  {
    intent: 'PAYMENT_RECEIVED',
    templateName: 'gd_payment_received',
    language: 'en',
    category: 'UTILITY',
    label: 'Payment received',
    description: 'Receipt confirmation after a payment is recorded.',
    body:
      'Hi {{member_name}}, we received your payment of {{payment_amount}} at {{gym_name}}. Thank you.',
  },
  {
    intent: 'MEMBERSHIP_RENEWAL',
    templateName: 'gd_membership_renewed',
    language: 'en',
    category: 'UTILITY',
    label: 'Membership renewed',
    description: 'Confirmation after a successful renewal.',
    body:
      'Hi {{member_name}}, your {{membership_plan}} membership at {{gym_name}} has been renewed and is valid until {{membership_expiry}}.',
  },
  {
    intent: 'CLASS_SCHEDULE',
    templateName: 'gd_class_schedule',
    language: 'en',
    category: 'UTILITY',
    label: 'Class schedule',
    description: 'Scheduled class or session reminder.',
    body:
      'Hi {{member_name}}, your session with {{trainer_name}} at {{gym_name}} is scheduled for {{class_time}}.',
  },
  {
    intent: 'MEMBERSHIP_WELCOME',
    templateName: 'gd_member_welcome',
    language: 'en',
    category: 'UTILITY',
    label: 'New member welcome',
    description: 'Welcome note after a member registration.',
    body:
      'Welcome to {{gym_name}}, {{member_name}}. Your membership is active until {{membership_expiry}}. We are glad to have you with us.',
  },
  {
    intent: 'ATTENDANCE',
    templateName: 'gd_attendance_checkin',
    language: 'en',
    category: 'UTILITY',
    label: 'Attendance confirmation',
    description: 'Service message confirming a recorded visit.',
    body: 'Hi {{member_name}}, your visit to {{gym_name}} was recorded successfully.',
  },
  {
    intent: 'SERVICE_ANNOUNCEMENT',
    templateName: 'gd_service_update',
    language: 'en',
    category: 'UTILITY',
    label: 'Service update',
    description: 'Operational service notice such as a schedule or closure change.',
    body: 'Hi {{member_name}}, an update from {{gym_name}}: {{class_time}}',
  },
];

const BY_INTENT = new Map<string, UtilityTemplateDefinition>(
  UTILITY_TEMPLATES.map((definition) => [definition.intent, definition])
);

export function getUtilityTemplate(intent: string): UtilityTemplateDefinition | null {
  return BY_INTENT.get(intent) ?? null;
}

export function getUtilityTemplateByName(name: string): UtilityTemplateDefinition | null {
  return UTILITY_TEMPLATES.find((definition) => definition.templateName === name) ?? null;
}

/**
 * The body component shape Meta expects on submission. We deliberately send a
 * single body component with positional parameters matching the declared
 * variables in order.
 */
export function buildTemplateComponents(definition: UtilityTemplateDefinition): {
  name: string;
  language: string;
  category: string;
  components: unknown[];
} {
  const variables = extractVariableNames(definition.body);
  const example = variables.map((key) => {
    switch (key) {
      case 'member_name':
        return 'Aarav Sharma';
      case 'gym_name':
        return 'GymDeck Fitness';
      case 'membership_plan':
        return 'Gold Monthly';
      case 'membership_expiry':
        return '25 November 2026';
      case 'payment_amount':
        return '1,500 INR';
      case 'payment_due_date':
        return '25 November 2026';
      case 'trainer_name':
        return 'Coach Riya';
      case 'class_time':
        return '6:00 PM today';
      default:
        return 'example';
    }
  });

  return {
    name: definition.templateName,
    language: definition.language,
    category: definition.category,
    components: [
      {
        type: 'BODY',
        text: definition.body,
        example: { body_text: [example] },
      },
    ],
  };
}
