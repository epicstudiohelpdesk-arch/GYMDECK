/**
 * GymDeck Business Intelligence & Analytics - Date Resolution & Series Utilities
 */

import { AppError } from '../../shared/errors';
import { DateRangePreset, ResolvedDateRange, TrendDataPoint } from './types';

const MAX_ANALYTICS_RANGE_DAYS = 366; // Maximum 1 calendar year bounded query

/**
 * 1. Resolve date range from preset or explicit from/to dates
 */
export function resolveDateRange(
  preset?: DateRangePreset,
  fromStr?: string,
  toStr?: string,
  timezone: string = 'UTC'
): ResolvedDateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let effectivePreset: DateRangePreset = preset || 'this_month';

  if (fromStr && toStr) {
    startDate = new Date(fromStr);
    endDate = new Date(toStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw AppError.validation('Invalid from or to date format. Expected valid ISO date strings.');
    }

    if (startDate > endDate) {
      throw AppError.validation('Start date (from) cannot be after end date (to).');
    }

    effectivePreset = 'custom';
  } else {
    switch (preset) {
      case 'today': {
        startDate = new Date(now);
        startDate.setUTCHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }
      case 'yesterday': {
        startDate = new Date(now);
        startDate.setUTCDate(now.getUTCDate() - 1);
        startDate.setUTCHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setUTCDate(now.getUTCDate() - 1);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }
      case 'this_week': {
        startDate = new Date(now);
        const day = startDate.getUTCDay();
        const diff = startDate.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate.setUTCDate(diff);
        startDate.setUTCHours(0, 0, 0, 0);

        endDate = new Date(now);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }
      case 'last_week': {
        startDate = new Date(now);
        const day = startDate.getUTCDay();
        const diff = startDate.getUTCDate() - day - 6; // Last Monday
        startDate.setUTCDate(diff);
        startDate.setUTCHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 6);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }
      case 'this_month': {
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        endDate = new Date(now);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }
      case 'last_month': {
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        break;
      }
      case 'this_year': {
        startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        endDate = new Date(now);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }
      default: {
        // Default to last 30 days
        startDate = new Date(now);
        startDate.setUTCDate(now.getUTCDate() - 29);
        startDate.setUTCHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setUTCHours(23, 59, 59, 999);
        effectivePreset = 'this_month';
        break;
      }
    }
  }

  // Calculate inclusive day count
  const diffMs = endDate.getTime() - startDate.getTime();
  const daysCount = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;

  if (daysCount > MAX_ANALYTICS_RANGE_DAYS) {
    throw AppError.validation(
      `Date range exceeds maximum allowed window of ${MAX_ANALYTICS_RANGE_DAYS} days.`
    );
  }

  return {
    startDate,
    endDate,
    preset: effectivePreset,
    timezone,
    daysCount,
  };
}

/**
 * 2. Generate a continuous daily date bucket array for trend reporting
 */
export function generateDateBuckets(startDate: Date, endDate: Date): string[] {
  const buckets: string[] = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    buckets.push(current.toISOString().split('T')[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return buckets;
}

/**
 * 3. Align sparse aggregated database rows with full continuous date series (Fill zeros)
 */
export function fillTrendGaps(
  buckets: string[],
  dbRows: Array<{ date: string; value: number | string }>
): TrendDataPoint[] {
  const valueMap = new Map<string, number>();

  for (const row of dbRows) {
    if (row.date) {
      const normalizedDate = row.date.split('T')[0]!;
      valueMap.set(normalizedDate, Number(row.value || 0));
    }
  }

  return buckets.map((date) => ({
    date,
    value: valueMap.get(date) || 0,
  }));
}
