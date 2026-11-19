/**
 * GymDeck WhatsApp - background worker lifecycle.
 *
 * Started by the cloud gateway server (not the desktop app), so queued and
 * scheduled messages keep flowing when the gym owner's computer is switched off.
 */

import { config } from '../../shared/config';
import { logger } from '../../shared/logging';
import { whatsappQueueProcessor } from './queueProcessor';
import { whatsappAutomationService } from './automationService';

class WhatsAppWorker {
  private timer: NodeJS.Timeout | null = null;
  private ticks = 0;
  private started = false;

  public start(): void {
    if (this.started || config.NODE_ENV === 'test') return;
    this.started = true;

    // Recover abandoned jobs as soon as the process comes up.
    whatsappQueueProcessor
      .recoverStale()
      .catch((err) =>
        logger.warn('[whatsapp-worker] stale recovery failed', {
          message: err instanceof Error ? err.message : 'unknown',
        })
      );

    this.timer = setInterval(() => {
      void this.runTick();
    }, config.WHATSAPP_WORKER_INTERVAL_MS);

    if (typeof this.timer.unref === 'function') this.timer.unref();
    logger.info('[whatsapp-worker] started', {
      intervalMs: config.WHATSAPP_WORKER_INTERVAL_MS,
      providerMode: config.NOTIFICATION_PROVIDER_MODE,
    });
  }

  private async runTick(): Promise<void> {
    try {
      const result = await whatsappQueueProcessor.tick();
      if (result.claimed || result.recovered || result.expired) {
        logger.info('[whatsapp-worker] queue tick', { ...result } as Record<string, unknown>);
      }

      // Automation scans are heavier; run once per 5 ticks (~ every 75s at the default interval).
      this.ticks += 1;
      if (this.ticks % 5 === 0) {
        const automation = await whatsappAutomationService.runDueRules();
        if (automation.gyms) {
          logger.info('[whatsapp-worker] automation tick', {
            ...automation,
          } as Record<string, unknown>);
        }
      }
    } catch (err) {
      logger.error('[whatsapp-worker] tick failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
  }
}

export const whatsappWorker = new WhatsAppWorker();
export default whatsappWorker;
