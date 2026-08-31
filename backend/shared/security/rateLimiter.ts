/**
 * GymDeck Cloud Backend - Multi-Tier Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 300000).unref();

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  errorMessage?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowSeconds,
    maxRequests,
    keyGenerator = (req: Request) => `${req.ip}_${req.baseUrl}${req.path}`,
    errorMessage = 'Too many requests. Please try again later.',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting in automated test environment if requested
    if (process.env.NODE_ENV === 'test' && req.header('x-skip-rate-limit') === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      next(AppError.rateLimited(errorMessage));
      return;
    }

    next();
  };
}

// Preset rate limiters for authentication endpoints
export const authRateLimiter = {
  login: createRateLimiter({
    windowSeconds: 900, // 15 mins
    maxRequests: 5,
    keyGenerator: (req) => `login_${req.ip}_${(req.body?.email || '').toLowerCase()}`,
    errorMessage: 'Too many failed login attempts. Please wait 15 minutes before retrying.',
  }),
  signup: createRateLimiter({
    windowSeconds: 3600, // 1 hour
    maxRequests: 10,
    keyGenerator: (req) => `signup_${req.ip}`,
    errorMessage: 'Too many account registrations from this network. Please try again later.',
  }),
  otpVerify: createRateLimiter({
    windowSeconds: 600, // 10 mins
    maxRequests: 5,
    keyGenerator: (req) => `otp_verify_${(req.body?.email || req.ip).toLowerCase()}`,
    errorMessage: 'Maximum verification attempts exceeded. Please request a new verification code.',
  }),
  otpResend: createRateLimiter({
    windowSeconds: 3600, // 1 hour
    maxRequests: 5,
    keyGenerator: (req) => `otp_resend_${(req.body?.email || req.ip).toLowerCase()}`,
    errorMessage: 'Too many verification code requests. Please wait before requesting another code.',
  }),
  forgotPassword: createRateLimiter({
    windowSeconds: 3600, // 1 hour
    maxRequests: 5,
    keyGenerator: (req) => `forgot_pwd_${(req.body?.email || req.ip).toLowerCase()}`,
    errorMessage: 'Too many password reset requests. Please check your inbox or wait 1 hour.',
  }),
  refresh: createRateLimiter({
    windowSeconds: 300, // 5 mins
    maxRequests: 30,
    keyGenerator: (req) => `refresh_${req.ip}`,
    errorMessage: 'Too many token refresh requests. Please re-authenticate.',
  }),
};
