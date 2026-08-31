/**
 * GymDeck Cloud Backend - Centralized Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors';
import { logger } from '../../../shared/logging';
import { isDevelopment } from '../../../shared/config';
import { ApiErrorResponse } from '../../../shared/types';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const requestId = req.id;

  let statusCode = 500;
  let domain = 'INTERNAL_ERROR';
  let message = 'An unexpected internal server error occurred';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    domain = err.domain;
    message = err.message;
    details = err.details;
  } else {
    // Log unhandled non-AppError with full context
    logger.error(`[UnhandledException] ${err.message}`, err, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    });
  }

  // Never expose raw stack traces or internal SQL errors in production
  if (!isDevelopment && statusCode === 500) {
    message = 'An unexpected internal server error occurred';
    details = undefined;
  }

  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      domain,
      message,
      statusCode,
      details: details ?? undefined,
      requestId,
      timestamp,
    },
  };

  res.status(statusCode).json(responsePayload);
}

export default errorHandler;
