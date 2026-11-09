/**
 * GymDeck Payments V2 - receiving-account validation.
 * Syntax validation only. It does NOT prove ownership or that a VPA is active.
 */

export const PAYMENT_METHODS = ['UPI', 'BANK_TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ACCOUNT_STATUSES = [
  'UNVERIFIED',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'VERIFICATION_FAILED',
  'DISABLED',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_TYPES = ['Current Account', 'Savings Account', 'Other Business Account'] as const;

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function normalizeIfsc(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/** Format check only. Never treat as bank-ownership verification. */
export function isValidIfsc(input: string): boolean {
  return IFSC_RE.test(normalizeIfsc(input));
}

/** Reasonable VPA structure check. Handle list is intentionally not hardcoded. */
export function isValidVpa(input: string): boolean {
  return VPA_RE.test(input.trim());
}

export function normalizeVpa(input: string): string {
  return input.trim().toLowerCase();
}

/** Indian bank account numbers are 9-18 digits for the supported rails. */
export function isValidAccountNumber(input: string): boolean {
  const digits = input.replace(/\s+/g, '');
  return /^[0-9]{9,18}$/.test(digits);
}

export function normalizeAccountNumber(input: string): string {
  return input.replace(/\s+/g, '');
}

export function maskAccountNumber(value: string): string {
  const digits = normalizeAccountNumber(value);
  return digits.length <= 4 ? `•••• ${digits}` : `•••• •••• ${digits.slice(-4)}`;
}
