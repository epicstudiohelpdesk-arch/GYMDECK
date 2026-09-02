/**
 * GymDeck Owner Mobile - Unified Error Domain
 */

export type ErrorDomain =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'NETWORK'
  | 'STORAGE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER'
  | 'UNKNOWN';

export class AppError extends Error {
  public readonly domain: ErrorDomain;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(message: string, domain: ErrorDomain = 'UNKNOWN', statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.domain = domain;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public static unauthorized(message = 'Session expired. Please log in again.'): AppError {
    return new AppError(message, 'AUTHENTICATION', 401);
  }

  public static forbidden(message = 'You do not have permission to perform this action.'): AppError {
    return new AppError(message, 'AUTHORIZATION', 403);
  }

  public static network(message = 'Unable to connect to GymDeck Cloud. Please check your internet connection.'): AppError {
    return new AppError(message, 'NETWORK', 0);
  }

  public static validation(message: string, details?: unknown): AppError {
    return new AppError(message, 'VALIDATION', 400, details);
  }

  public static storage(message = 'Failed to securely access local credentials.'): AppError {
    return new AppError(message, 'STORAGE', 500);
  }
}
