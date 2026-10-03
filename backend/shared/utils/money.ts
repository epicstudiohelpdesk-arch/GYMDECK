/**
 * Decimal-safe monetary representation and integer minor-unit arithmetic.
 *
 * GymDeck standardizes all financial arithmetic on integer minor units (paise).
 * 1 Rupee = 100 Paise.
 *
 * No binary floating-point multiplication (amount * 100) or parseFloat() arithmetic.
 */

export type MinorUnits = bigint;

/**
 * Converts any numeric, string, or bigint currency value into integer minor units (paise).
 *
 * Supports:
 * - "100.00" -> 10000n
 * - "999.99" -> 99999n
 * - "0.01" -> 1n
 * - "0.5" -> 50n
 * - 125.75 -> 12575n
 * - 500 -> 50000n
 * - 50000n -> 50000n
 *
 * Rejects values with more than 2 meaningful decimal places (e.g. "12.345").
 */
export function toMinorUnits(val: string | number | bigint | null | undefined): bigint {
  if (val === null || val === undefined) return 0n;
  if (typeof val === 'bigint') return val;

  let str: string;
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      throw new Error(`Invalid non-finite monetary number: ${val}`);
    }
    str = val.toFixed(4);
  } else {
    str = String(val).trim();
  }

  if (str === '') return 0n;

  const isNegative = str.startsWith('-');
  const absStr = isNegative || str.startsWith('+') ? str.slice(1) : str;

  const parts = absStr.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid monetary decimal string: '${str}'`);
  }

  const wholeStr = parts[0] || '0';
  const whole = BigInt(wholeStr);

  const fracStr = parts[1] || '';
  let paise = 0n;

  if (fracStr.length === 0) {
    paise = 0n;
  } else if (fracStr.length === 1) {
    paise = BigInt(fracStr[0] || '0') * 10n;
  } else if (fracStr.length === 2) {
    paise = BigInt(fracStr);
  } else {
    for (let i = 2; i < fracStr.length; i++) {
      if (fracStr[i] !== '0') {
        throw new Error(`Monetary value has more than 2 decimal places: '${str}'`);
      }
    }
    paise = BigInt(fracStr.slice(0, 2));
  }

  const total = whole * 100n + paise;
  return isNegative ? -total : total;
}

/**
 * Converts integer minor units (paise) into an exact 2-decimal string representation (e.g. "125.75", "0.01", "100.00").
 *
 * Uses integer division and modulo. Zero floating-point arithmetic.
 */
export function fromMinorUnits(units: bigint | number): string {
  const bUnits = typeof units === 'bigint' ? units : BigInt(units);
  const isNegative = bUnits < 0n;
  const abs = isNegative ? -bUnits : bUnits;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const fracStr = frac < 10n ? `0${frac}` : `${frac}`;
  return `${isNegative ? '-' : ''}${whole}.${fracStr}`;
}

/**
 * Converts integer minor units to a JavaScript number strictly for wire/API compatibility where required.
 */
export function minorUnitsToNumber(units: bigint | number): number {
  return Number(fromMinorUnits(units));
}

/**
 * Add two monetary values in minor units.
 */
export function addMinorUnits(a: bigint | number | string, b: bigint | number | string): bigint {
  return toMinorUnits(a) + toMinorUnits(b);
}

/**
 * Subtract two monetary values in minor units.
 */
export function subMinorUnits(a: bigint | number | string, b: bigint | number | string): bigint {
  return toMinorUnits(a) - toMinorUnits(b);
}
