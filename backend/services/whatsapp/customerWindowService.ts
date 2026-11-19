/**
 * GymDeck WhatsApp - 24-hour customer service window state.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database';
import { whatsappCustomerWindows } from '../../shared/database/schema';
import { computeServiceWindow, SERVICE_WINDOW_HOURS } from './policy';

export class WhatsAppCustomerWindowService {
  /** Record a genuine inbound customer message; this opens the window. */
  public async recordInbound(params: {
    gymId: string;
    memberId: string | null;
    senderAccountId: string;
    receivedAt?: Date;
  }): Promise<void> {
    if (!params.memberId) return;

    const receivedAt = params.receivedAt ?? new Date();
    const expiresAt = new Date(
      receivedAt.getTime() + SERVICE_WINDOW_HOURS * 60 * 60 * 1000
    );

    await db
      .insert(whatsappCustomerWindows)
      .values({
        gymId: params.gymId,
        memberId: params.memberId,
        senderAccountId: params.senderAccountId,
        lastInboundMessageAt: receivedAt,
        serviceWindowExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          whatsappCustomerWindows.gymId,
          whatsappCustomerWindows.memberId,
          whatsappCustomerWindows.senderAccountId,
        ],
        set: {
          lastInboundMessageAt: receivedAt,
          serviceWindowExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
  }

  public async get(
    gymId: string,
    memberId: string,
    senderAccountId: string
  ): Promise<{ isOpen: boolean; lastInboundAt: string | null; expiresAt: string | null }> {
    const rows = await db
      .select()
      .from(whatsappCustomerWindows)
      .where(
        and(
          eq(whatsappCustomerWindows.gymId, gymId),
          eq(whatsappCustomerWindows.memberId, memberId),
          eq(whatsappCustomerWindows.senderAccountId, senderAccountId)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return { isOpen: false, lastInboundAt: null, expiresAt: null };

    const state = computeServiceWindow(new Date(row.lastInboundMessageAt));
    return {
      isOpen: state.isOpen,
      lastInboundAt: state.lastInboundAt ? state.lastInboundAt.toISOString() : null,
      expiresAt: state.expiresAt ? state.expiresAt.toISOString() : null,
    };
  }

  /** Bulk variant for audience evaluation. */
  public async getMany(
    gymId: string,
    memberIds: string[],
    senderAccountId: string
  ): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    for (const memberId of memberIds) map.set(memberId, false);
    if (!memberIds.length) return map;

    const rows = await db
      .select()
      .from(whatsappCustomerWindows)
      .where(
        and(
          eq(whatsappCustomerWindows.gymId, gymId),
          eq(whatsappCustomerWindows.senderAccountId, senderAccountId)
        )
      );

    const now = new Date();
    for (const row of rows) {
      if (!map.has(row.memberId)) continue;
      const state = computeServiceWindow(new Date(row.lastInboundMessageAt), now);
      map.set(row.memberId, state.isOpen);
    }
    return map;
  }
}

export const whatsappCustomerWindowService = new WhatsAppCustomerWindowService();
export default whatsappCustomerWindowService;
