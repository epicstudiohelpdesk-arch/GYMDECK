/**
 * GymDeck Cloud Gateway - Owner WhatsApp Communication Hub
 *
 * Everything here is tenant-scoped from the authenticated owner/staff context.
 * No route accepts a gym id from the client, and no route returns an OpenWA
 * API key or session credential.
 */

import { Router, Request } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../../shared/validation';
import { requirePermission } from '../middleware/rbacMiddleware';
import { createRateLimiter } from '../../../shared/security/rateLimiter';
import { AppError } from '../../../shared/errors';
import { whatsappAccountService } from '../../../services/whatsapp/accountService';
import { templateService } from '../../../services/whatsapp/templateService';
import { whatsappMessageService } from '../../../services/whatsapp/messageService';
import { whatsappConsentService } from '../../../services/whatsapp/consentService';
import { whatsappAutomationService } from '../../../services/whatsapp/automationService';

const router: Router = Router();

const sendLimiter = createRateLimiter({
  windowSeconds: 600,
  maxRequests: 30,
  keyGenerator: (req) =>
    `whatsapp_send_${req.user?.gymId || 'anon'}_${req.user?.userId || req.ip}`,
  errorMessage: 'Too many WhatsApp send requests. Please wait a few minutes.',
});

const connectLimiter = createRateLimiter({
  windowSeconds: 300,
  maxRequests: 10,
  keyGenerator: (req) => `whatsapp_connect_${req.user?.gymId || req.ip}`,
  errorMessage: 'Too many connection attempts. Please wait a few minutes.',
});

function tenantContext(req: Request): { gymId: string; userId: string } {
  const gymId = req.user?.gymId;
  const userId = req.user?.userId || req.user?.sub;
  if (!gymId || !userId) throw AppError.forbidden('Tenant WhatsApp context is missing.');
  return { gymId, userId };
}

/* ------------------------------------------------------------------ schemas */

const AudienceQuerySchema = z
  .object({
    mode: z
      .enum(['SELECTED', 'ALL', 'STATUS', 'EXPIRING', 'PENDING_PAYMENT', 'RECENT_ATTENDANCE'])
      .default('ALL'),
    status: z.string().max(32).optional(),
    search: z.string().max(80).optional(),
    withinDays: z.coerce.number().min(1).max(90).optional(),
    memberIds: z.string().max(8000).optional(),
    limit: z.coerce.number().min(1).max(200).optional(),
  })
  .strict();

const AudienceSchema = z
  .object({
    mode: z
      .enum(['SELECTED', 'ALL', 'STATUS', 'EXPIRING', 'PENDING_PAYMENT', 'RECENT_ATTENDANCE'])
      .optional(),
    status: z.string().max(32).optional(),
    search: z.string().max(80).optional(),
    withinDays: z.number().min(1).max(90).optional(),
    memberIds: z.array(z.string().uuid()).max(200).optional(),
    limit: z.number().min(1).max(200).optional(),
  })
  .strict();

const PreviewSchema = z
  .object({
    audience: AudienceSchema,
    body: z.string().max(2000).optional(),
    intent: z.string().max(60).optional(),
    templateId: z.string().uuid().optional(),
    classTime: z.string().max(60).optional(),
    paymentAmount: z.number().min(0).max(100000000).optional(),
    paymentDueDate: z.string().max(40).optional(),
    scheduledAt: z.string().datetime().optional().nullable(),
  })
  .strict();

const SendSchema = PreviewSchema.extend({
  clientBatchId: z.string().uuid().optional(),
  confirm: z.boolean().optional(),
}).strict();

const HistoryQuerySchema = z
  .object({
    status: z.string().max(32).optional(),
    search: z.string().max(80).optional(),
    limit: z.coerce.number().min(1).max(200).optional(),
    offset: z.coerce.number().min(0).max(100000).optional(),
  })
  .strict();

const ConsentSchema = z
  .object({
    status: z.enum(['GRANTED', 'PENDING', 'WITHDRAWN']),
    source: z.string().min(2).max(60).optional(),
  })
  .strict();

const AutomationSchema = z
  .object({
    rules: z
      .array(
        z
          .object({
            ruleType: z.string().min(3).max(40),
            offsetDays: z.number().int().min(-30).max(90),
            sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            isEnabled: z.boolean(),
            templateId: z.string().uuid().nullable().optional(),
          })
          .strict()
      )
      .min(1)
      .max(40),
  })
  .strict();

/* --------------------------------------------------------------- connection */

router.get('/connection', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: await whatsappAccountService.getConnection(gymId) });
  } catch (err) {
    next(err);
  }
});

router.get('/prerequisites', requirePermission('communications.read'), async (_req, res, next) => {
  try {
    res.json({ data: whatsappAccountService.getPrerequisites() });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/connection/connect',
  requirePermission('settings.write'),
  connectLimiter,
  async (req, res, next) => {
    try {
      const { gymId, userId } = tenantContext(req);
      res.json({ data: await whatsappAccountService.connect(gymId, userId) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/connection/verify',
  requirePermission('settings.write'),
  connectLimiter,
  async (req, res, next) => {
    try {
      const { gymId } = tenantContext(req);
      res.json({ data: await whatsappAccountService.verifyConnection(gymId) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/connection/disconnect',
  requirePermission('settings.write'),
  async (req, res, next) => {
    try {
      const { gymId, userId } = tenantContext(req);
      res.json({ data: await whatsappAccountService.disconnect(gymId, userId) });
    } catch (err) {
      next(err);
    }
  }
);

/* ---------------------------------------------------------------- templates */

router.get('/templates', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: { templates: await templateService.list(gymId) } });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------------------- audience */

router.get(
  '/audience',
  requirePermission('communications.read'),
  validateQuery(AudienceQuerySchema),
  async (req, res, next) => {
    try {
      const { gymId } = tenantContext(req);
      const query: any = req.query;
      const memberIds = query.memberIds
        ? String(query.memberIds)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined;
      res.json({
        data: await whatsappMessageService.audience(gymId, {
          mode: query.mode,
          status: query.status,
          search: query.search,
          withinDays: query.withinDays,
          memberIds,
          limit: query.limit,
        }),
      });
    } catch (err) {
      next(err);
    }
  }
);

/* ----------------------------------------------------------------- messages */

router.post(
  '/messages/preview',
  requirePermission('communications.send'),
  validateBody(PreviewSchema),
  async (req, res, next) => {
    try {
      const { gymId } = tenantContext(req);
      res.json({ data: await whatsappMessageService.preview(gymId, req.body) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/messages/send',
  requirePermission('communications.send'),
  sendLimiter,
  validateBody(SendSchema),
  async (req, res, next) => {
    try {
      const { gymId, userId } = tenantContext(req);
      res.json({ data: await whatsappMessageService.send(gymId, userId, req.body) });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/messages',
  requirePermission('communications.read'),
  validateQuery(HistoryQuerySchema),
  async (req, res, next) => {
    try {
      const { gymId } = tenantContext(req);
      res.json({
        data: await whatsappMessageService.history(gymId, {
          status: req.query.status as string | undefined,
          search: req.query.search as string | undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          offset: req.query.offset ? Number(req.query.offset) : undefined,
        }),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/messages/:id', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const id = z.string().uuid().parse(req.params.id);
    res.json({ data: await whatsappMessageService.getJob(gymId, id) });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/messages/:id/cancel',
  requirePermission('communications.send'),
  async (req, res, next) => {
    try {
      const { gymId, userId } = tenantContext(req);
      const id = z.string().uuid().parse(req.params.id);
      res.json({ data: await whatsappMessageService.cancel(gymId, id, userId) });
    } catch (err) {
      next(err);
    }
  }
);

/* ------------------------------------------------------------------ summary */

router.get('/overview', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: await whatsappMessageService.overview(gymId) });
  } catch (err) {
    next(err);
  }
});

router.get('/usage', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const days = req.query.days ? Math.min(90, Math.max(1, Number(req.query.days))) : 30;
    res.json({ data: await templateService.usage(gymId, days) });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------- consents */

router.get('/consents', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const audience = await whatsappMessageService.audience(gymId, {
      mode: 'ALL',
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      limit: 200,
    });
    res.json({ data: audience });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/consents/:memberId',
  requirePermission('communications.send'),
  validateBody(ConsentSchema),
  async (req, res, next) => {
    try {
      const { gymId, userId } = tenantContext(req);
      const memberId = z.string().uuid().parse(req.params.memberId);
      res.json({
        data: await whatsappConsentService.set({
          gymId,
          memberId,
          status: req.body.status,
          source: req.body.source || 'OWNER_RECORDED',
          actorUserId: userId,
        }),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/consents/:memberId/history',
  requirePermission('communications.read'),
  async (req, res, next) => {
    try {
      const { gymId } = tenantContext(req);
      const memberId = z.string().uuid().parse(req.params.memberId);
      res.json({ data: { history: await whatsappConsentService.history(gymId, memberId) } });
    } catch (err) {
      next(err);
    }
  }
);

/* --------------------------------------------------------------- automation */

router.get('/automation', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    res.json({ data: { rules: await whatsappAutomationService.listRules(gymId) } });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/automation',
  requirePermission('settings.write'),
  validateBody(AutomationSchema),
  async (req, res, next) => {
    try {
      const { gymId, userId } = tenantContext(req);
      res.json({
        data: {
          rules: await whatsappAutomationService.saveRules(gymId, req.body.rules, userId),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
