/**
 * GymDeck Cloud Backend - Unified Member Domain API Routes (/v1/member)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { authService } from '../../../services/auth';
import { dashboardService, checkInPassService, attendanceService } from '../../../services/member';
import { membershipService } from '../../../services/membership';
import { workoutService } from '../../../services/workout';
import { ptService } from '../../../services/pt';
import { documentService } from '../../../services/documents';
import { notificationService } from '../../../services/notifications';
import { progressService } from '../../../services/progress';
import { validateQuery, validateBody } from '../../../shared/validation';

const router: Router = Router();

// ==============================================================================
// Validation Schemas
// ==============================================================================

const GymLinkBodySchema = z.object({
  gymCode: z.string().min(2, 'Gym code is required'),
});

const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const CheckInBodySchema = z.object({
  passToken: z.string().optional(),
  entryMethod: z.enum(['QR_DYNAMIC', 'MANUAL', 'RFID', 'BIOMETRIC']).default('QR_DYNAMIC'),
  deviceMetadata: z.string().optional(),
});

const StartWorkoutSessionSchema = z.object({
  routineId: z.string().uuid().optional(),
  sessionName: z.string().min(1).max(100).optional(),
});

const LogWorkoutSetSchema = z.object({
  exerciseId: z.string().uuid().optional(),
  exerciseName: z.string().min(1),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(1000),
  repsCompleted: z.number().int().min(0).max(500),
  isCompleted: z.boolean().optional(),
});

const CompleteWorkoutSessionSchema = z.object({
  totalVolumeKg: z.number().min(0).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  completedSetsCount: z.number().int().min(0).optional(),
});

const WeightLogSchema = z.object({
  weightKg: z.number().min(30).max(300),
  notes: z.string().max(255).optional(),
});

const MeasurementLogSchema = z.object({
  chestCm: z.number().min(20).max(300).optional(),
  waistCm: z.number().min(20).max(300).optional(),
  armsCm: z.number().min(10).max(150).optional(),
  thighsCm: z.number().min(10).max(200).optional(),
  hipsCm: z.number().min(20).max(300).optional(),
});

// All member domain routes require authenticated member context
router.use(requireAuth);

// ==============================================================================
// 0. Gym Affiliation & Onboarding Linking
// ==============================================================================

router.post('/gym-link', validateBody(GymLinkBodySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await authService.linkGym(user.sub, req.body.gymCode);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 1. Dashboard & Core Membership
// ==============================================================================

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await dashboardService.getDashboardData(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/membership', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await membershipService.getMemberMembership(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/check-in-pass', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = checkInPassService.generateCheckInPass(user.gymId, user.memberId, user.sub);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/check-in', validateBody(CheckInBodySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const idempotencyKey = req.header('Idempotency-Key') || req.header('idempotency-key');

    const result = await attendanceService.submitCheckIn({
      gymId: user.gymId,
      memberId: user.memberId,
      idempotencyKey,
      passToken: req.body.passToken,
      entryMethod: req.body.entryMethod,
      deviceMetadata: req.body.deviceMetadata,
    });

    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/attendance', validateQuery(PaginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { page, limit } = req.query as any;

    const result = await attendanceService.getAttendanceHistory(
      user.gymId,
      user.memberId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 2. Workout Domain
// ==============================================================================

router.get('/workouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await workoutService.getRoutines(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/workout-sessions',
  validateBody(StartWorkoutSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await workoutService.startSession(user.gymId, user.memberId, req.body);
      res.status(201).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/workout-sessions/:sessionId/sets',
  validateBody(LogWorkoutSetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await workoutService.logSet(user.gymId, user.memberId, req.params.sessionId!, req.body);
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

router.post(
  '/workout-sessions/:sessionId/complete',
  validateBody(CompleteWorkoutSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const idempotencyKey = req.header('Idempotency-Key') || req.header('idempotency-key');
      const result = await workoutService.completeSession(
        user.gymId,
        user.memberId,
        req.params.sessionId!,
        req.body,
        idempotencyKey
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

router.get('/workout-history', validateQuery(PaginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { page, limit } = req.query as any;
    const result = await workoutService.getWorkoutHistory(
      user.gymId,
      user.memberId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20
    );
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 3. Personal Training Domain
// ==============================================================================

router.get('/trainer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await ptService.getTrainerProfile(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/pt-package', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await ptService.getPtPackage(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/pt-sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await ptService.getPtSessions(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 4. Private Document Vault Domain
// ==============================================================================

router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await documentService.getMemberDocuments(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/documents/:id/secure-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await documentService.getDocumentSecureUrl(user.gymId, user.memberId, req.params.id!);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 5. Notification Center Domain
// ==============================================================================

router.get('/notifications', validateQuery(PaginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { page, limit } = req.query as any;
    const result = await notificationService.getNotifications(
      user.gymId,
      user.memberId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20
    );
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await notificationService.markAsRead(user.gymId, user.memberId, req.params.id!);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await notificationService.markAllAsRead(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 6. Fitness Progress Domain
// ==============================================================================

router.get('/progress/weight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await progressService.getWeightHistory(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/progress/weight', validateBody(WeightLogSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await progressService.logWeight(user.gymId, user.memberId, req.body);
    res.status(201).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/progress/measurements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await progressService.getMeasurements(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/progress/measurements',
  validateBody(MeasurementLogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const result = await progressService.logMeasurements(user.gymId, user.memberId, req.body);
      res.status(201).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/progress/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await progressService.getMilestones(user.gymId, user.memberId);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
