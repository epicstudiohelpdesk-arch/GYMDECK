/**
 * GymDeck WhatsApp - Shared domain types.
 *
 * These types are provider-agnostic so the same rules drive live Cloud API
 * delivery, sandbox delivery and deterministic tests.
 */

export const CONNECTION_STATUSES = [
  'NOT_CONNECTED',
  'CONNECTING',
  'VERIFICATION_REQUIRED',
  'PENDING_APPROVAL',
  'CONNECTED',
  'CONNECTION_EXPIRED',
  'REAUTHORIZATION_REQUIRED',
  'RESTRICTED',
  'DISCONNECTED',
  'ERROR',
  'SANDBOX',
  'DEVELOPMENT',
] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const MESSAGE_STATUSES = [
  'DRAFT',
  'QUEUED',
  'PROCESSING',
  'ACCEPTED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'REJECTED',
  'CANCELLED',
] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const TEMPLATE_APPROVAL_STATUSES = [
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAUSED',
  'DISABLED',
] as const;

export type TemplateApprovalStatus = (typeof TEMPLATE_APPROVAL_STATUSES)[number];

export const CONSENT_STATUSES = ['PENDING', 'GRANTED', 'WITHDRAWN'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export type MessageKind = 'UTILITY' | 'MARKETING';

export type DeliveryMode = 'TEXT' | 'TEMPLATE' | 'BLOCKED';

export const WHATSAPP_VARIABLES = [
  'member_name',
  'gym_name',
  'membership_plan',
  'membership_expiry',
  'payment_amount',
  'payment_due_date',
  'trainer_name',
  'class_time',
] as const;

export type WhatsAppVariable = (typeof WHATSAPP_VARIABLES)[number];

export interface OwnerFacingError {
  code: string;
  message: string;
}

export interface DeliveryEvaluation {
  allowed: boolean;
  mode: DeliveryMode;
  reasonCode: string | null;
  ownerMessage: string | null;
}
