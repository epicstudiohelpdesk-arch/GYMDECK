/**
 * GymDeck Cloud Backend - OpenWA provider webhooks.
 *
 * OpenWA posts every session event to /v1/webhooks/openwa and signs the exact
 * raw body with HMAC-SHA256. No Meta callback or hub handshake remains.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { openwaWebhookProcessor } from '../../../services/whatsapp/openwaWebhookProcessor';
import { resourceRateLimiter } from '../../../shared/security/rateLimiter';

const router: Router = Router();

/**
 * OpenWA gateway callback (POST).
 *
 * OpenWA signs every delivery with X-OpenWA-Signature: sha256=<hex> over the
 * exact body. The tenant is resolved from the session id stored on the gym's
 * account row; no caller-supplied gym id is trusted.
 */
router.post(
  '/openwa',
  resourceRateLimiter.webhookIngress,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-openwa-signature'] as string | undefined;
      const rawBody = (req as any).rawBody as Buffer | undefined;
      const result = await openwaWebhookProcessor.handle(rawBody, signature, req.body);
      res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
