/**
 * GymDeck WhatsApp - Personalisation variables.
 *
 * Owners may write free-form text with {{variable}} placeholders. Resolution is
 * strict: a template with an unresolved variable is never sent with an empty
 * string, because a partially rendered billing/expiry message is worse than a
 * clear "this member is missing data" error.
 */

import { WHATSAPP_VARIABLES, type WhatsAppVariable } from './types';

const SUPPORTED = new Set<string>(WHATSAPP_VARIABLES);
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const VARIABLE_LABELS: Record<WhatsAppVariable, string> = {
  member_name: 'Member name',
  gym_name: 'Gym name',
  membership_plan: 'Membership plan',
  membership_expiry: 'Membership expiry date',
  payment_amount: 'Payment amount',
  payment_due_date: 'Payment due date',
  trainer_name: 'Trainer name',
  class_time: 'Class time',
};

export interface RenderResult {
  text: string;
  usedVariables: string[];
  unknownVariables: string[];
  missingVariables: string[];
}

function asDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === 'boolean') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const text = String(value).trim();
  return text.length ? text : null;
}

/**
 * Render a message body for one member. Missing/unknown variables are reported
 * and the caller must refuse to send rather than substituting an empty value.
 */
export function renderWhatsAppMessage(
  body: string,
  values: Partial<Record<WhatsAppVariable, unknown>>
): RenderResult {
  const used = new Set<string>();
  const unknown = new Set<string>();
  const missing = new Set<string>();

  const text = String(body ?? '').replace(PLACEHOLDER_RE, (_match, rawName: string) => {
    const name = String(rawName).toLowerCase();
    used.add(name);

    if (!SUPPORTED.has(name)) {
      unknown.add(name);
      return '';
    }

    const value = asDisplayValue(values[name as WhatsAppVariable]);
    if (!value) {
      missing.add(name);
      return '';
    }
    return value;
  });

  return {
    text,
    usedVariables: [...used],
    unknownVariables: [...unknown],
    missingVariables: [...missing],
  };
}

/** Extract the variable names a template body declares, in first-use order. */
export function extractVariableNames(body: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  while ((match = re.exec(String(body ?? ''))) !== null) {
    const name = String(match[1]).toLowerCase();
    if (!seen.has(name)) {
      seen.add(name);
      found.push(name);
    }
  }
  return found;
}

export function hasControlCharacters(input: string): boolean {
  return CONTROL_CHARS_RE.test(input);
}

/** Trim, normalise newlines and reject control characters. */
export function sanitizeWhatsAppBody(raw: string): string {
  const value = String(raw ?? '').replace(/\r\n/g, '\n').trim();
  if (hasControlCharacters(value)) {
    throw new Error('Message contains unsupported control characters.');
  }
  return value;
}

export interface VariableResolutionIssue {
  memberId: string;
  memberName: string;
  variables: string[];
}

/** Human-readable list for owner-facing surfaces. */
export function describeVariableIssues(issues: VariableResolutionIssue[]): string {
  if (!issues.length) return '';
  if (issues.length === 1) {
    const only = issues[0]!;
    return `${only.memberName} is missing ${only.variables.join(', ')}.`;
  }
  return `${issues.length} members are missing personalisation data; fix them or remove the variables.`;
}
