/**
 * Email suppression normalization.
 *
 * Suppression is global by address, not tenant-scoped. New writes are stored
 * lowercase, while lookups use lower(email_address) so legacy mixed-case rows
 * remain effective. The existing lookup index is on raw email_address; no
 * schema change is required for this table.
 */

import { inArray, sql } from 'drizzle-orm';
import { emailSuppressions } from '../../shared/database/schema';

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Return the normalized set of addresses that are suppressed. The query
 * lowercases the stored column so mixed-case legacy records cannot bypass it.
 */
export async function findSuppressedEmails(
  executor: any,
  emails: string[]
): Promise<Set<string>> {
  const normalized = Array.from(
    new Set(emails.map(normalizeEmailAddress).filter((email) => email.length > 0))
  );

  if (normalized.length === 0) return new Set();

  const rows = await executor
    .select({ emailAddress: emailSuppressions.emailAddress })
    .from(emailSuppressions)
    .where(inArray(sql`lower(${emailSuppressions.emailAddress})`, normalized));

  return new Set(rows.map((row: { emailAddress: string }) => normalizeEmailAddress(row.emailAddress)));
}

/**
 * Insert a suppression once per normalized address. Must run inside the
 * caller's transaction so the advisory lock and duplicate check are atomic.
 * Existing records (including mixed-case rows) are preserved, not rewritten.
 */
export async function addEmailSuppressionTx(
  tx: any,
  input: {
    gymId: string | null;
    emailAddress: string;
    suppressionReason: string;
    source?: string;
  }
): Promise<boolean> {
  const emailAddress = normalizeEmailAddress(input.emailAddress);
  if (!emailAddress) return false;

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`email-suppression:${emailAddress}`}, 0))`
  );

  const existing = await tx
    .select({ id: emailSuppressions.id })
    .from(emailSuppressions)
    .where(sql`lower(${emailSuppressions.emailAddress}) = ${emailAddress}`)
    .limit(1);

  if (existing.length > 0) return false;

  await tx.insert(emailSuppressions).values({
    gymId: input.gymId,
    emailAddress,
    suppressionReason: input.suppressionReason,
    source: input.source,
  });

  return true;
}
