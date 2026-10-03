/**
 * GymDeck Owner Mobile - Currency Formatter Utility
 *
 * Formats numbers in Indian Rupees (₹) with en-IN comma grouping.
 * Safe presentation utility without floating-point mutations or arithmetic.
 */

export function formatCurrency(
  amount: number | string | null | undefined,
  includeDecimals: boolean = false
): string {
  if (amount === null || amount === undefined) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  })}`;
}

export function formatIndianRupees(
  amount: number | string | null | undefined
): string {
  return formatCurrency(amount, true);
}

/**
 * Formats integer minor units (paise) in Indian Rupees (₹) with en-IN comma grouping.
 *
 * Example:
 * 50000 -> "₹500.00"
 * 250050 -> "₹2,500.50"
 * 1 -> "₹0.01"
 * 0 -> "₹0.00"
 *
 * Zero floating-point arithmetic used.
 */
export function formatMinorUnits(
  paise: number | bigint | null | undefined,
  includeDecimals: boolean = true
): string {
  if (paise === null || paise === undefined) return '₹0';
  const bPaise = typeof paise === 'bigint' ? paise : BigInt(Math.round(paise));
  const isNegative = bPaise < 0n;
  const abs = isNegative ? -bPaise : bPaise;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const wholeFormatted = Number(whole).toLocaleString('en-IN');
  const sign = isNegative ? '-' : '';

  if (!includeDecimals && frac === 0n) {
    return `${sign}₹${wholeFormatted}`;
  }

  const fracStr = frac < 10n ? `0${frac}` : `${frac}`;
  return `${sign}₹${wholeFormatted}.${fracStr}`;
}
