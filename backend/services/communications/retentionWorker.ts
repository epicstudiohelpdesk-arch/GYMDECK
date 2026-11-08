/**
 * GymDeck Cloud Backend - Communication Retention Worker
 * Purges assisted-broadcast audit rows after their 90-day TTL. No message bodies exist.
 */

import { communicationService } from './communicationService';
import { logger } from '../../shared/logging';

export class CommunicationRetentionWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  public start(intervalMs = 6 * 60 * 60 * 1000): void {
    if (this.running) return;
    this.running = true;
    const tick = async () => {
      if (!this.running) return;
      try {
        const result = await communicationService.purgeExpired();
        if (result.purged > 0) {
          logger.info(`[CommsRetention] Purged ${result.purged} expired broadcast records.`);
        }
      } catch (err: any) {
        logger.error(`[CommsRetention] Purge failed: ${err?.message || err}`);
      }
      if (this.running) this.timer = setTimeout(tick, intervalMs);
    };
    this.timer = setTimeout(tick, 60_000);
    logger.info('[CommsRetention] Retention worker started.');
  }

  public stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const communicationRetentionWorker = new CommunicationRetentionWorker();
export default communicationRetentionWorker;
