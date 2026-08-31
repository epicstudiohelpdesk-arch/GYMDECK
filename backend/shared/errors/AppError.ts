/**
 * GymDeck Cloud Backend - Centralized Error Hierarchy
 */

export type ErrorDomain =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly domain: ErrorDomain;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    domain: ErrorDomain,
    message: string,
    statusCode: number,
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.domain = domain;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public static validation(message: string = 'Validation failed', details?: unknown): AppError {
    return new AppError('VALIDATION_ERROR', message, 422, true, details);
  }

  public static unauthorized(message: string = 'Authentication required or invalid credentials', details?: unknown): AppError {
    return new AppError('UNAUTHORIZED', message, 401, true, details);
  }

  public static forbidden(message: string = 'Access denied for this tenant or resource', details?: unknown): AppError {
    return new AppError('FORBIDDEN', message, 403, true, details);
  }

  public static notFound(message: string = 'Requested resource not found', details?: unknown): AppError {
    return new AppError('NOT_FOUND', message, 404, true, details);
  }

  public static conflict(message: string = 'Resource conflict or duplicate operation', details?: unknown): AppError {
    return new AppError('CONFLICT', message, 409, true, details);
  }

  public static rateLimited(message: string = 'Too many requests. Please retry later.', details?: unknown): AppError {
    return new AppError('RATE_LIMITED', message, 429, true, details);
  }

  public static database(message: string = 'Database operation failed', details?: unknown): AppError {
    return new AppError('DATABASE_ERROR', message, 500, false, details);
  }

  public static internal(message: string = 'An unexpected internal error occurred'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500, false);
  }
}

export default AppError;
