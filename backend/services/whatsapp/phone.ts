/**
 * GymDeck WhatsApp - Recipient phone normalisation and masking.
 *
 * WhatsApp requires an international number without '+' or separators. We never
 * guess a country from a bare local number silently: the gym's configured
 * default country code (WHATSAPP_DEFAULT_COUNTRY_CODE, default 91) is applied
 * only to 10-digit local numbers.
 */

const MIN_MSISDN_LENGTH = 10;
const MAX_MSISDN_LENGTH = 15;

export function resolveDefaultCountryCode(): string {
  const raw = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');
  return raw.length >= 1 && raw.length <= 3 ? raw : '91';
}

/**
 * Normalise a stored member/gym number to E.164 without a plus.
 * Returns null when the input cannot be represented as a valid MSISDN.
 */
export function normalizeWhatsAppNumber(
  input: string | null | undefined,
  defaultCountryCode: string = resolveDefaultCountryCode()
): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject alphabetic content outright rather than stripping it into a bogus number.
  if (/[a-zA-Z]/.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // Leading international prefix variants: 00<cc>...
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }

  if (digits.length < MIN_MSISDN_LENGTH || digits.length > MAX_MSISDN_LENGTH) return null;
  if (/^0+$/.test(digits)) return null;
  if (digits.startsWith('0')) return null;

  return digits;
}

export function isValidWhatsAppNumber(input: string | null | undefined): boolean {
  return normalizeWhatsAppNumber(input) !== null;
}

/** Display helper: +<cc> ••••• <last4>. Never exposes the middle of the number. */
export function maskWhatsAppNumber(input: string | null | undefined): string | null {
  const normalized = normalizeWhatsAppNumber(input);
  if (!normalized) return null;
  const tail = normalized.slice(-4);
  const cc = normalized.slice(0, Math.max(2, normalized.length - 10));
  return `+${cc} ••••• ${tail}`;
}

/** OpenWA expects the recipient without '+'; both forms are accepted at the edge. */
export function toMetaRecipient(input: string): string {
  return input.replace(/\D/g, '');
}

/** Compare two numbers for identity purposes (dedupe), ignoring formatting. */
export function sameWhatsAppNumber(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeWhatsAppNumber(a);
  const right = normalizeWhatsAppNumber(b);
  return Boolean(left && right && left === right);
}
