/**
 * GymDeck Cloud Backend - Authentication API Routes (/v1/auth)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../../../services/auth';
import { validateBody } from '../../../shared/validation';
import { authRateLimiter } from '../../../shared/security';

const router: Router = Router();

// ==============================================================================
// Validation Schemas
// ==============================================================================

const SignupSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number must be at least 7 digits').optional().default('0000000000'),
  gymId: z.string().uuid().optional(),
  gymCode: z.string().optional(),
});

const VerifyEmailSchema = z
  .object({
    email: z.string().email('Valid email address is required'),
    code: z.string().optional(),
    otp: z.string().optional(),
  })
  .transform((d) => ({
    email: d.email,
    code: (d.code || d.otp || '').trim(),
  }))
  .refine((d) => d.code.length === 6, {
    message: 'Verification code must be exactly 6 digits',
    path: ['code'],
  });

const ResendOtpSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

const LoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().optional(),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceFingerprint: z.string().optional(),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

const ResetPasswordSchema = z
  .object({
    email: z.string().email('Valid email address is required'),
    token: z.string().optional(),
    otp: z.string().optional(),
    newPassword: z.string().optional(),
    password: z.string().optional(),
  })
  .transform((d) => ({
    email: d.email,
    token: (d.token || d.otp || '').trim(),
    newPassword: d.newPassword || d.password || '',
  }))
  .refine((d) => d.token.length >= 6, {
    message: 'Reset authorization token/OTP is required',
    path: ['token'],
  })
  .refine((d) => d.newPassword.length >= 8 && /[A-Z]/.test(d.newPassword) && /[0-9]/.test(d.newPassword), {
    message: 'New password must be at least 8 chars with an uppercase letter and a number',
    path: ['newPassword'],
  });

const VerifyInviteSchema = z.object({
  tokenOrCode: z.string().min(1, 'Invitation token or code is required'),
});

const CompleteInviteSchema = z.object({
  activationTicket: z.string().min(1, 'Activation ticket is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const GenerateInviteSchema = z.object({
  gymId: z.string().uuid('Valid gym ID required'),
  memberId: z.string().uuid('Valid member ID required'),
});

// ==============================================================================
// Route Endpoints
// ==============================================================================

/**
 * POST /v1/auth/signup
 */
router.post(
  '/signup',
  authRateLimiter.signup,
  validateBody(SignupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.signup(req.body);
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
 * POST /v1/auth/verify-email
 */
router.post(
  '/verify-email',
  authRateLimiter.otpVerify,
  validateBody(VerifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.verifyEmail(req.body);
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
 * POST /v1/auth/resend-verification (and alias /resend-otp)
 */
const handleResendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.resendVerificationOtp(req.body);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
};

router.post('/resend-verification', authRateLimiter.otpResend, validateBody(ResendOtpSchema), handleResendOtp);
router.post('/resend-otp', authRateLimiter.otpResend, validateBody(ResendOtpSchema), handleResendOtp);

/**
 * POST /v1/auth/login
 */
router.post(
  '/login',
  authRateLimiter.login,
  validateBody(LoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
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
 * POST /v1/auth/refresh
 */
router.post(
  '/refresh',
  authRateLimiter.refresh,
  validateBody(RefreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refreshToken(req.body);
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
 * POST /v1/auth/logout
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.logout({ refreshToken: req.body?.refreshToken });
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
 * POST /v1/auth/forgot-password
 */
router.post(
  '/forgot-password',
  authRateLimiter.forgotPassword,
  validateBody(ForgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body);
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
 * POST /v1/auth/reset-password
 */
router.post(
  '/reset-password',
  validateBody(ResetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body);
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
 * POST /v1/auth/invite/verify
 * Validates a member QR code / 8-character invitation code
 */
router.post(
  '/invite/verify',
  validateBody(VerifyInviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.validateActivationInvite(req.body.tokenOrCode);
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
 * POST /v1/auth/invite/complete
 * Activates digital account for existing gym member from verified invitation
 */
router.post(
  '/invite/complete',
  validateBody(CompleteInviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.activateAndCreateAccount(req.body);
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
 * POST /v1/auth/invite/generate
 * Generates an invitation token & QR code for a gym member (Used by Desktop/Manager)
 */
router.post(
  '/invite/generate',
  validateBody(GenerateInviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.createActivationInvite(req.body.gymId, req.body.memberId);
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

export default router;
