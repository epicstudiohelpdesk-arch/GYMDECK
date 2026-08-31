/**
 * GymDeck Cloud Backend - Authentication & Authorization Context Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JwtPayload } from '../../../shared/security';
import { config } from '../../../shared/config';
import { AppError } from '../../../shared/errors';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication required. Missing Bearer token.'));
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = verifyJwt<JwtPayload>(token, config.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    return next(AppError.unauthorized('Invalid or expired authentication token.'));
  }
}

export default requireAuth;
