/**
 * GymDeck Cloud Backend - Owner & Staff Authentication API Routes (/v1/auth/owner)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ownerAuthService } from '../../../services/auth/ownerAuthService';
import { validateBody } from '../../../shared/validation';
import { authRateLimiter } from '../../../shared/security';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/rbacMiddleware';

const router: Router = Router();

// ==============================================================================
// Validation Schemas
// ==============================================================================

const OwnerSignupSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[0-9]/, 'Password must contain numbers'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  gymName: z.string().min(2, 'Gym name is required'),
  gymCode: z.string().optional(),
});

const OwnerBootstrapDesktopSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  gymId: z.string().uuid('Valid gym UUID is required'),
  gymName: z.string().min(1, 'Gym name is required'),
  gymCode: z.string().optional(),
  userId: z.string().uuid('Valid user UUID is required').optional(),
});

const OwnerLoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().optional(),
});

const OwnerRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceFingerprint: z.string().optional(),
});

const OwnerForgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

const OwnerResetPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
  token: z.string().min(6, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ==============================================================================
// Route Endpoints
// ==============================================================================

/**
 * POST /v1/auth/owner/bootstrap-desktop
 * Controlled bootstrap/linking of Desktop local Owner identity & gym tenant to Cloud
 */
router.post(
  '/bootstrap-desktop',
  authRateLimiter.signup,
  validateBody(OwnerBootstrapDesktopSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.bootstrapDesktop(req.body);
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
 * POST /v1/auth/owner/signup
 */
router.post(
  '/signup',
  authRateLimiter.signup,
  validateBody(OwnerSignupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.signup(req.body);
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

/**
 * POST /v1/auth/owner/login
 */
router.post(
  '/login',
  authRateLimiter.login,
  validateBody(OwnerLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.login(req.body);
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
 * POST /v1/auth/owner/refresh
 */
router.post(
  '/refresh',
  authRateLimiter.refresh,
  validateBody(OwnerRefreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.refreshToken(req.body);
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
 * POST /v1/auth/owner/logout
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.logout({
        refreshToken: req.body?.refreshToken,
        userId: req.user?.userId || req.user?.sub,
      });
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
 * POST /v1/auth/owner/forgot-password
 */
router.post(
  '/forgot-password',
  authRateLimiter.forgotPassword,
  validateBody(OwnerForgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.forgotPassword(req.body);
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
 * POST /v1/auth/owner/reset-password
 */
router.post(
  '/reset-password',
  authRateLimiter.login,
  validateBody(OwnerResetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ownerAuthService.resetPassword(req.body);
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
 * GET /v1/auth/owner/me
 */
router.get(
  '/me',
  requireAuth,
  requireRole(['OWNER', 'MANAGER', 'STAFF', 'ADMIN', 'RECEPTIONIST', 'TRAINER']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId || req.user!.sub;
      const gymId = req.user!.gymId;
      const result = await ownerAuthService.getMe(userId, gymId);

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
