/**
 * GymDeck WhatsApp - tenant-scoped audit trail.
 *
 * Metadata must never contain access tokens, WABA secrets or full phone
 * numbers. Callers pass masked/summary values only.
 */

import { db } from '../../shared/database';
import { whatsappAuditLogs } from '../../shared/database/schema';

export async function recordWhatsAppAudit(params: {
  gymId: string;
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(whatsappAuditLogs).values({
      gymId: params.gymId,
      actorId: params.actorId ?? null,
      action: params.action,
      targetId: params.targetId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (err) {
    // An audit write failure must not roll back an already-committed message
    // state change, but it must be visible to operators.
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[whatsapp-audit] failed to write audit entry', { action: params.action, message });
  }
}
