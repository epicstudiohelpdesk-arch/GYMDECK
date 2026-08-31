/**
 * GymDeck Member Mobile - Normalized Application Error Model
 */

export type ErrorDomain =
  | 'NETWORK'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'STORAGE'
  | 'SERVER'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface AppErrorDetails {
  domain: ErrorDomain;
  code: string;
  userMessage: string;
  internalMessage?: string;
  statusCode?: number;
  validationErrors?: Record<string, string[]>;
  isTransient?: boolean;
}

export class AppError extends Error {
  public readonly domain: ErrorDomain;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly internalMessage?: string;
  public readonly statusCode?: number;
  public readonly validationErrors?: Record<string, string[]>;
  public readonly isTransient: boolean;

  constructor(details: AppErrorDetails) {
    super(details.userMessage);
    this.name = 'AppError';
    this.domain = details.domain;
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.internalMessage = details.internalMessage;
    this.statusCode = details.statusCode;
    this.validationErrors = details.validationErrors;
    this.isTransient = details.isTransient ?? false;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static network(message = 'Unable to connect to GymDeck. Please check your internet connection.'): AppError {
    return new AppError({
      domain: 'NETWORK',
      code: 'NETWORK_DISCONNECTED',
      userMessage: message,
      isTransient: true,
    });
  }

  static timeout(message = 'The server took too long to respond. Please try again.'): AppError {
    return new AppError({
      domain: 'TIMEOUT',
      code: 'REQUEST_TIMEOUT',
      userMessage: message,
      isTransient: true,
    });
  }

  static unauthorized(message = 'Your session has expired. Please sign in again.'): AppError {
    return new AppError({
      domain: 'AUTHENTICATION',
      code: 'AUTH_UNAUTHORIZED',
      userMessage: message,
      statusCode: 401,
      isTransient: false,
    });
  }

  static forbidden(message = 'You do not have permission to perform this action.'): AppError {
    return new AppError({
      domain: 'AUTHORIZATION',
      code: 'AUTH_FORBIDDEN',
      userMessage: message,
      statusCode: 403,
      isTransient: false,
    });
  }

  static validation(
    validationErrors?: Record<string, string[]>,
    message = 'Please check the form inputs and try again.'
  ): AppError {
    return new AppError({
      domain: 'VALIDATION',
      code: 'VALIDATION_FAILED',
      userMessage: message,
      statusCode: 422,
      validationErrors,
      isTransient: false,
    });
  }

  static server(message = 'An unexpected server error occurred. Please try again shortly.'): AppError {
    return new AppError({
      domain: 'SERVER',
      code: 'SERVER_INTERNAL_ERROR',
      userMessage: message,
      statusCode: 500,
      isTransient: true,
    });
  }

  static storage(message = 'An error occurred while accessing local secure storage.'): AppError {
    return new AppError({
      domain: 'STORAGE',
      code: 'STORAGE_FAILURE',
      userMessage: message,
      isTransient: false,
    });
  }

  static fromUnknown(err: unknown): AppError {
    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof Error) {
      return new AppError({
        domain: 'UNKNOWN',
        code: 'UNKNOWN_ERROR',
        userMessage: err.message || 'Something went wrong. Please try again.',
        internalMessage: err.stack,
      });
    }

    return new AppError({
      domain: 'UNKNOWN',
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred.',
      internalMessage: String(err),
    });
  }
}
