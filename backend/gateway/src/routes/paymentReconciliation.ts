/** GymDeck Payments V2 - Owner reconciliation routes. Mounted in the owner router. */

import { Router, Request } from 'express';
import { z } from 'zod';
import { reconciliationService } from '../../../services/payments/reconciliationService';
import { refundService } from '../../../services/payments/refundService';
import { requirePermission } from '../middleware/rbacMiddleware';
import { AppError } from '../../../shared/errors';
import { validateBody } from '../../../shared/validation';

const router: Router = Router();

const VerifyBody = z.object({
  amountMinor: z.number().int().positive().optional(),
  note: z.string().max(1000).optional(),
});
const ReasonBody = z.object({ reason: z.string().min(3).max(1000) });
const ClarifyBody = z.object({ note: z.string().min(3).max(1000) });

function ctx(req: Request) {
  const gymId = req.user!.gymId;
  if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
  return { gymId, actorUserId: req.user!.userId || req.user!.sub };
}

router.get('/pending', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    res.status(200).json({ success: true, data: await reconciliationService.listPending(gymId, limit, offset) });
  } catch (err) {
    next(err);
  }
});

router.get('/all', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    res.status(200).json({ success: true, data: await reconciliationService.listAll(gymId, status, limit, offset) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    res.status(200).json({ success: true, data: await reconciliationService.getDetail(gymId, req.params.id!) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/verify', requirePermission('payments.write'), validateBody(VerifyBody), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const result = await reconciliationService.verify(gymId, req.params.id!, actorUserId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', requirePermission('payments.write'), validateBody(ReasonBody), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const result = await reconciliationService.reject(gymId, req.params.id!, actorUserId, req.body.reason);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/clarify', requirePermission('payments.write'), validateBody(ClarifyBody), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const result = await reconciliationService.requestClarification(gymId, req.params.id!, actorUserId, req.body.note);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/refunds/:paymentId', requirePermission('payments.write'), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const refund = await refundService.record(gymId, req.params.paymentId!, actorUserId, req.body);
    res.status(201).json({ success: true, data: { refund } });
  } catch (err) {
    next(err);
  }
});

export default router;
