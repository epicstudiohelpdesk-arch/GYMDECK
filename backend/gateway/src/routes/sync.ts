/**
 * GymDeck Cloud Backend - Desktop & Mobile Synchronization API Routes (/v1/sync)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { syncService } from '../../../services/sync';
import { validateQuery, validateBody } from '../../../shared/validation';
import { AppError } from '../../../shared/errors';

const router: Router = Router();

// ==============================================================================
// Validation Schemas
// ==============================================================================

const SyncPushEventSchema = z.object({
  eventId: z.string().uuid('Valid UUIDv4 event ID is required'),
  entityType: z.enum([
    'gym_member',
    'membership_plan',
    'member_membership',
    'payment',
    'attendance',
    'attendance_log',
    'trainer',
  ]),
  entityId: z.string().uuid('Valid UUIDv4 entity ID is required'),
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE', 'VOID']),
  payload: z.record(z.any()),
  clientTimestamp: z.string(),
});

const SyncPushBodySchema = z.object({
  deviceId: z.string().min(1, 'Device identifier is required'),
  events: z.array(SyncPushEventSchema).max(500, 'Batch size limit is 500 events'),
});

const SyncPullQuerySchema = z.object({
  deviceId: z.string().min(1, 'Device identifier is required'),
  cursor: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(500).default(100),
});

// All sync routes require authenticated gym/device context
router.use(requireAuth);

/**
 * POST /v1/sync/push
 * Asynchronously pushes a transactional batch of local mutations to Cloud
 */
router.post(
  '/push',
  validateBody(SyncPushBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (!user.gymId) {
        throw AppError.forbidden('User token does not contain gym tenant context.');
      }

      const { deviceId, events } = req.body;
      const result = await syncService.pushBatch(user.gymId, deviceId, events, user.sub);

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /v1/sync/pull
 * Incrementally pulls all remote changes since the last acknowledged server sequence cursor
 */
router.get(
  '/pull',
  validateQuery(SyncPullQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (!user.gymId) {
        throw AppError.forbidden('User token does not contain gym tenant context.');
      }

      const { deviceId, cursor, limit } = req.query as any;
      const result = await syncService.pullChanges(
        user.gymId,
        deviceId,
        Number(cursor) || 0,
        Number(limit) || 100
      );

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
