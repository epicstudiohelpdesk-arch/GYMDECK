/**
 * GymDeck Email Communication Gateway Routes
 *
 * All routes enforce tenant isolation via tenantContext(req) (derived from authenticated JWT).
 */

import { Router, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/rbacMiddleware';
import { AppError } from '../../../shared/errors';
import { emailService } from '../../../services/email/emailService';
import { postalWebhookService } from '../../../services/email/webhookService';
import { verifyPostalWebhookSignature } from '../../../services/email/postalWebhookAuth';
import { createRateLimiter } from '../../../shared/security/rateLimiter';

const router: Router = Router();

const sendLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 15,
  keyGenerator: (req: Request) => `email_send_${req.user?.gymId || 'anon'}`,
  errorMessage: 'Too many email requests. Please wait a minute before sending again.',
});

function tenantContext(req: Request): { gymId: string; userId: string } {
  const gymId = req.user?.gymId;
  const userId = req.user?.userId || req.user?.sub;
  if (!gymId || !userId) throw AppError.forbidden('Tenant authorization context missing.');
  return { gymId, userId };
}

/* ------------------------------------------------------------------ schemas */

const ComposeEmailSchema = z.object({
  subject: z.string().min(1).max(255),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  senderDisplayName: z.string().max(120).optional(),
  replyToAddress: z.string().email().optional().or(z.literal('')),
  recipients: z.array(
    z.object({
      memberId: z.string().uuid().optional(),
      email: z.string().email(),
      name: z.string().optional(),
    })
  ).min(1).max(1000),
  idempotencyKey: z.string().max(128).optional(),
});

/* ------------------------------------------------------------------ routes */

// Inbound Postal webhook (backward-compatible alias; canonical route is
// /v1/webhooks/postal). It is defined before requireAuth because Postal
// authenticates with its RSA signature, not a GymDeck JWT.
router.post('/webhooks/postal', async (req, res, next) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const authResult = verifyPostalWebhookSignature(rawBody, req.headers);

    if (!authResult.valid) {
      throw AppError.unauthorized(`Postal webhook verification failed: ${authResult.reason || 'Invalid signature'}`);
    }

    await postalWebhookService.handleWebhook(req.body);
    res.json({ status: 'ok', verifiedVia: authResult.algorithm });
  } catch (err) {
    next(err);
  }
});

// Every remaining email endpoint requires an authenticated GymDeck user.
router.use(requireAuth);

// 1. Overview Dashboard Stats & Monthly Quota
router.get('/overview', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: await emailService.getOverview(gymId) });
  } catch (err) {
    next(err);
  }
});

// 2. Member Recipients Search & Segmentation
router.get('/recipients', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const filter = {
      status: req.query.status as string,
      search: req.query.search as string,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    };
    res.json({ data: await emailService.getRecipients(gymId, filter) });
  } catch (err) {
    next(err);
  }
});

// 3. Compose & Send Email Broadcast
router.post('/send', requirePermission('communications.send'), sendLimiter, async (req, res, next) => {
  try {
    const { gymId, userId } = tenantContext(req);
    const dto = ComposeEmailSchema.parse(req.body);
    const result = await emailService.sendEmail(gymId, userId, dto as any);
    res.status(202).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// 4. Drafts
router.get('/drafts', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: await emailService.getDrafts(gymId) });
  } catch (err) {
    next(err);
  }
});

router.post('/drafts', requirePermission('communications.send'), async (req, res, next) => {
  try {
    const { gymId, userId } = tenantContext(req);
    const result = await emailService.saveDraft(gymId, userId, req.body);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/drafts/:id', requirePermission('communications.send'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    await emailService.deleteDraft(gymId, String(req.params.id));
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// 5. Sent Email History
router.get('/history', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const params = {
      limit: req.query.limit ? Number(req.query.limit) : 20,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      search: req.query.search as string,
    };
    res.json({ data: await emailService.getHistory(gymId, params) });
  } catch (err) {
    next(err);
  }
});

// 6. Message Inspection & Individual Recipient Delivery Records
router.get('/messages/:id', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: await emailService.getMessageDetails(gymId, String(req.params.id)) });
  } catch (err) {
    next(err);
  }
});

// 7. Templates
router.get('/templates', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: await emailService.getTemplates(gymId) });
  } catch (err) {
    next(err);
  }
});

router.post('/templates', requirePermission('communications.send'), async (req, res, next) => {
  try {
    const { gymId, userId } = tenantContext(req);
    res.json({ data: await emailService.createTemplate(gymId, userId, req.body) });
  } catch (err) {
    next(err);
  }
});

export default router;
