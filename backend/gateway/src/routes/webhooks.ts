/**
 * GymDeck Cloud Backend - Provider Webhook Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { webhookService } from '../../../services/notifications/webhookService';

const router: Router = Router();

/**
 * 1. Meta WhatsApp Webhook Subscription Handshake (GET)
 */
router.get(
  '/whatsapp',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const mode = (req.query['hub.mode'] as string) || '';
      const token = (req.query['hub.verify_token'] as string) || '';
      const challenge = (req.query['hub.challenge'] as string) || '';

      const responseChallenge = webhookService.verifyWhatsAppSubscription(mode, token, challenge);
      res.status(200).send(responseChallenge);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 2. Meta WhatsApp Status Updates Callback (POST)
 */
router.post(
  '/whatsapp',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const rawBody = JSON.stringify(req.body);

      const result = await webhookService.processWhatsAppWebhook(req.body, rawBody, signature);
      res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
