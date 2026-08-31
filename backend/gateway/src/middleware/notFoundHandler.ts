/**
 * GymDeck Cloud Backend - 404 Route Not Found Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export default notFoundHandler;
