/**
 * GymDeck Cloud Backend - Redacting Structured JSON Logger
 */

import { isDevelopment } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_PATTERNS = [
  /password/i,
  /pass/i,
  /secret/i,
  /token/i,
  /otp/i,
  /code/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /api[_-]?key/i,
  /resend/i,
  /database_url/i,
  /signed_?url/i,
  /webhook[_-]?secret/i,
  /signature/i,
  /credential/i,
  /private[_-]?key/i,
];

/** Redact credential-like content embedded in free-form log messages. */
export function redactMessage(message: string): string {
  return String(message)
    .replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]')
    .replace(/([?&](?:token|secret|api[_-]?key|password|authorization|signature)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b(token|secret|api[_-]?key|password|authorization|signature|credential)\s*[:=]\s*([^\s,;}]+)/gi, '$1=[REDACTED]');
}

function redactValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(key)) return '[REDACTED]';
  }
  // Free-form values (error messages, upstream response bodies) can carry
  // credentials even when their key is innocuous.
  return redactMessage(value);
}

export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = redactValue(key, value);
    }
  }
  return sanitized;
}

class BackendLogger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? redactSensitiveData(context) : undefined;

    const payload = {
      timestamp,
      level: level.toUpperCase(),
      message: redactMessage(message),
      ...(sanitizedContext ? { context: sanitizedContext } : {}),
    };

    return JSON.stringify(payload);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (isDevelopment) {
      console.debug(this.formatLog('debug', message, context));
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    console.info(this.formatLog('info', message, context));
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatLog('warn', message, context));
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error
      ? { errorName: error.name, errorMessage: redactMessage(error.message), stack: isDevelopment ? redactMessage(error.stack ?? '') : undefined }
      : { errorRaw: redactMessage(String(error)) };

    console.error(this.formatLog('error', message, { ...errorDetails, ...context }));
  }
}

export const logger = new BackendLogger();
export default logger;
