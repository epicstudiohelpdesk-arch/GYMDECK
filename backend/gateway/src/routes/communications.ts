/**
 * GymDeck Cloud Gateway - Owner Communications (Mode A)
 * Tenant-scoped settings, consent-aware audience, and assisted deep-link broadcasts.
 */

import { Router, Request } from 'express';
import { z } from 'zod';
import { communicationService } from '../../../services/communications/communicationService';
import { validateBody, validateQuery } from '../../../shared/validation';
import { requirePermission } from '../middleware/rbacMiddleware';
import { createRateLimiter } from '../../../shared/security/rateLimiter';
import { AppError } from '../../../shared/errors';

const router: Router = Router();

const sendLimiter = createRateLimiter({
  windowSeconds: 600,
  maxRequests: 20,
  keyGenerator: (req) => `comm_send_${req.user?.gymId || 'anon'}_${req.user?.userId || req.ip}`,
  errorMessage: 'Too many broadcast requests. Please wait a few minutes.',
});

const SettingsSchema = z.object({
  primaryPhone: z.string().max(32).optional().nullable(),
  whatsappNumber: z.string().max(32).optional().nullable(),
  officialEmail: z.string().max(255).optional().nullable(),
  mobileForMembers: z.boolean().optional(),
  mobileSmsAllowed: z.boolean().optional(),
  mobileCallsAllowed: z.boolean().optional(),
  mobilePromosAllowed: z.boolean().optional(),
  whatsappForMembers: z.boolean().optional(),
  whatsappReceiptsAllowed: z.boolean().optional(),
  whatsappRemindersAllowed: z.boolean().optional(),
  whatsappSupportAllowed: z.boolean().optional(),
  whatsappPromosAllowed: z.boolean().optional(),
  emailForMembers: z.boolean().optional(),
  emailInvoicesAllowed: z.boolean().optional(),
  emailAlertsAllowed: z.boolean().optional(),
  emailNewsletterAllowed: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
}).strict();

const AudienceQuerySchema = z.object({
  status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'FROZEN', 'INACTIVE']).default('ALL'),
  search: z.string().max(80).optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
}).strict();

const BroadcastSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  messageKind: z.enum(['TRANSACTIONAL', 'ANNOUNCEMENT', 'PROMOTIONAL']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000),
  audience: z.object({
    status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'FROZEN', 'INACTIVE']).optional(),
    search: z.string().max(80).optional(),
    memberIds: z.array(z.string().uuid()).max(60).optional(),
    limit: z.number().min(1).max(60).optional(),
  }).strict().optional(),
}).strict();

const ProgressSchema = z.object({
  updates: z.array(z.object({
    recipientId: z.string().uuid(),
    status: z.enum(['SENT', 'FAILED', 'SKIPPED']),
  }).strict()).min(1).max(60),
}).strict();

const IdParamSchema = z.string().uuid();

function tenantContext(req: Request): { gymId: string; userId: string } {
  const gymId = req.user?.gymId;
  const userId = req.user?.userId || req.user?.sub;
  if (!gymId || !userId) throw AppError.forbidden('Tenant communication context is missing.');
  return { gymId, userId };
}

router.get('/settings', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const data = await communicationService.getSettings(gymId);
    res.status(200).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

router.put('/settings', requirePermission('settings.write'), validateBody(SettingsSchema), async (req, res, next) => {
  try {
    const { gymId, userId } = tenantContext(req);
    const data = await communicationService.saveSettings(gymId, req.body, userId, req.ip);
    res.status(200).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

router.get('/audience', requirePermission('members.read'), validateQuery(AudienceQuerySchema), async (req, res, next) => {
  try {
    const { gymId } = tenantContext(req);
    const data = await communicationService.getAudience(gymId, req.query as any);
    res.status(200).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

router.post('/broadcasts/preview', requirePermission('communications.send'), sendLimiter, validateBody(BroadcastSchema), async (req, res, next) => {
  try {
    const { gymId, userId } = tenantContext(req);
    const data = await communicationService.previewBroadcast(gymId, userId, req.body, req.ip);
    res.status(201).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

router.get('/broadcasts/:id', requirePermission('communications.read'), async (req, res, next) => {
  try {
    const parsed = IdParamSchema.safeParse(req.params.id);
    if (!parsed.success) throw AppError.validation('Invalid broadcast ID.');
    const { gymId } = tenantContext(req);
    const data = await communicationService.getBroadcast(gymId, parsed.data);
    res.status(200).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

router.patch('/broadcasts/:id/progress', requirePermission('communications.send'), validateBody(ProgressSchema), async (req, res, next) => {
  try {
    const parsed = IdParamSchema.safeParse(req.params.id);
    if (!parsed.success) throw AppError.validation('Invalid broadcast ID.');
    const { gymId, userId } = tenantContext(req);
    const data = await communicationService.updateProgress(gymId, parsed.data, req.body.updates, userId);
    res.status(200).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

router.post('/broadcasts/:id/cancel', requirePermission('communications.send'), async (req, res, next) => {
  try {
    const parsed = IdParamSchema.safeParse(req.params.id);
    if (!parsed.success) throw AppError.validation('Invalid broadcast ID.');
    const { gymId, userId } = tenantContext(req);
    const data = await communicationService.cancelBroadcast(gymId, parsed.data, userId);
    res.status(200).json({ success: true, data, meta: { requestId: req.id } });
  } catch (err) { next(err); }
});

export default router;
