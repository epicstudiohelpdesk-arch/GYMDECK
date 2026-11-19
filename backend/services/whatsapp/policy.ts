/**
 * GymDeck WhatsApp - WhatsApp Business Platform messaging policy.
 *
 * The 24-hour customer service window is a hard platform rule, not a UI hint:
 *  - inside the window, an eligible free-form text message is allowed;
 *  - outside it, only an APPROVED utility template may be sent;
 *  - if no approved template exists, the send is blocked with a clear reason.
 *
 * There is no bypass and no silent substitution.
 */

import type { DeliveryEvaluation, MessageStatus } from './types';

export const SERVICE_WINDOW_HOURS = 24;

export interface ServiceWindowState {
  lastInboundAt: Date | null;
  expiresAt: Date | null;
  isOpen: boolean;
  hoursRemaining: number;
}

export function computeServiceWindow(
  lastInboundAt: Date | null | undefined,
  now: Date = new Date(),
  windowHours: number = SERVICE_WINDOW_HOURS
): ServiceWindowState {
  if (!lastInboundAt || Number.isNaN(lastInboundAt.getTime())) {
    return { lastInboundAt: null, expiresAt: null, isOpen: false, hoursRemaining: 0 };
  }

  // A timestamp in the future is treated as "just now": clock drift must not
  // create an infinite window.
  const anchor = lastInboundAt.getTime() > now.getTime() ? now : lastInboundAt;
  const expiresAt = new Date(anchor.getTime() + windowHours * 60 * 60 * 1000);
  const remainingMs = expiresAt.getTime() - now.getTime();
  const isOpen = remainingMs > 0;

  return {
    lastInboundAt: anchor,
    expiresAt,
    isOpen,
    hoursRemaining: isOpen ? Math.round((remainingMs / (60 * 60 * 1000)) * 10) / 10 : 0,
  };
}

export interface DeliveryContext {
  accountStatus: string | null;
  hasValidPhone: boolean;
  consentStatus: string | null;
  messageKind: 'UTILITY' | 'MARKETING';
  windowOpen: boolean;
  template: {
    approvalStatus: string;
    category: string;
  } | null;
}

export const OWNER_ERRORS = {
  ACCOUNT_NOT_CONNECTED:
    'Connect the gym WhatsApp by scanning a QR code before sending messages.',
  ACCOUNT_REQUIRES_REAUTH:
    'Your WhatsApp connection needs to be renewed.',
  INVALID_RECIPIENT: 'This member does not have a valid WhatsApp number.',
  CONSENT_MISSING: 'This member has not opted in to WhatsApp notifications.',
  MARKETING_NOT_SUPPORTED:
    'GymDeck sends service notifications only. Promotional WhatsApp campaigns are not supported.',
  TEMPLATE_REQUIRED:
    'A saved notification template is required for this message because the 24-hour WhatsApp window is closed.',
  TEMPLATE_PENDING: 'This notification template is inactive.',
  TEMPLATE_REJECTED: 'This notification template is inactive. Update it before sending.',
  TEMPLATE_NOT_UTILITY: 'Only utility service templates can be sent outside the 24-hour window.',
  TEMPORARY_FAILURE:
    'Message could not be sent right now. GymDeck will retry automatically where safe.',
  DUPLICATE: 'This message was already queued for this member.',
} as const;

export function evaluateDelivery(context: DeliveryContext): DeliveryEvaluation {
  const notAllowed = (reasonCode: string, message: string, mode: DeliveryEvaluation['mode'] = 'BLOCKED'): DeliveryEvaluation => ({
    allowed: false,
    mode,
    reasonCode,
    ownerMessage: message,
  });

  if (context.accountStatus !== 'CONNECTED') {
    if (context.accountStatus === 'CONNECTION_EXPIRED' || context.accountStatus === 'REAUTHORIZATION_REQUIRED') {
      return notAllowed('ACCOUNT_REQUIRES_REAUTH', OWNER_ERRORS.ACCOUNT_REQUIRES_REAUTH);
    }
    return notAllowed('ACCOUNT_NOT_CONNECTED', OWNER_ERRORS.ACCOUNT_NOT_CONNECTED);
  }

  if (!context.hasValidPhone) {
    return notAllowed('INVALID_RECIPIENT', OWNER_ERRORS.INVALID_RECIPIENT);
  }

  if (context.consentStatus !== 'GRANTED') {
    return notAllowed('CONSENT_MISSING', OWNER_ERRORS.CONSENT_MISSING);
  }

  if (context.messageKind !== 'UTILITY') {
    return notAllowed('MARKETING_NOT_SUPPORTED', OWNER_ERRORS.MARKETING_NOT_SUPPORTED);
  }

  if (context.windowOpen) {
    return { allowed: true, mode: 'TEXT', reasonCode: null, ownerMessage: null };
  }

  if (!context.template) {
    return notAllowed('TEMPLATE_REQUIRED', OWNER_ERRORS.TEMPLATE_REQUIRED);
  }
  if (context.template.category !== 'UTILITY') {
    return notAllowed('TEMPLATE_NOT_UTILITY', OWNER_ERRORS.TEMPLATE_NOT_UTILITY);
  }
  if (context.template.approvalStatus === 'REJECTED') {
    return notAllowed('TEMPLATE_REJECTED', OWNER_ERRORS.TEMPLATE_REJECTED);
  }
  if (context.template.approvalStatus !== 'APPROVED') {
    return notAllowed('TEMPLATE_PENDING', OWNER_ERRORS.TEMPLATE_PENDING);
  }

  return { allowed: true, mode: 'TEMPLATE', reasonCode: null, ownerMessage: null };
}

/**
 * Monotonic message status machine. Webhooks can arrive out of order (read
 * before delivered, duplicate sent), so a transition never downgrades a job.
 */
const STATUS_RANK: Record<MessageStatus, number> = {
  DRAFT: 0,
  QUEUED: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  SENT: 4,
  DELIVERED: 5,
  READ: 6,
  FAILED: 7,
  REJECTED: 7,
  CANCELLED: 7,
};

const TERMINAL_NEGATIVE: MessageStatus[] = ['FAILED', 'REJECTED', 'CANCELLED'];

export function isTerminal(status: MessageStatus): boolean {
  return status === 'READ' || status === 'DELIVERED' || TERMINAL_NEGATIVE.includes(status);
}

export function isNegativeTerminal(status: MessageStatus): boolean {
  return TERMINAL_NEGATIVE.includes(status);
}

/**
 * Apply a provider-reported status to a job. Returns null when the event should
 * not change the stored state (duplicate or out-of-order downgrade).
 */
export function applyDeliveryStatus(
  current: MessageStatus,
  incoming: MessageStatus
): MessageStatus | null {
  if (current === incoming) return null;
  if (incoming === 'CANCELLED') {
    return current === 'QUEUED' || current === 'DRAFT' ? 'CANCELLED' : null;
  }
  if (isNegativeTerminal(current)) return null;
  if (incoming === 'FAILED' || incoming === 'REJECTED') {
    // A delivered/read message cannot later be marked failed.
    if (current === 'DELIVERED' || current === 'READ') return null;
    return incoming;
  }
  if (STATUS_RANK[incoming] <= STATUS_RANK[current]) return null;
  return incoming;
}

/** Map OpenWA/provider delivery statuses onto GymDeck's internal states. */
export function mapProviderStatus(status: string): MessageStatus | null {
  switch (String(status).toLowerCase()) {
    case 'accepted':
      return 'ACCEPTED';
    case 'sent':
      return 'SENT';
    case 'delivered':
      return 'DELIVERED';
    case 'read':
      return 'READ';
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}
