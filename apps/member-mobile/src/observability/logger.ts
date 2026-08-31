/**
 * GymDeck Member Mobile - Redacting Structured Logger
 * 
 * Automatically redacts sensitive fields (passwords, OTPs, tokens, auth headers).
 */

import { Config } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'passwordconfirm',
  'otp',
  'code',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'devicesecret',
  'cardnumber',
  'cvv',
  'pin',
]);

const sanitizeValue = (key: string, value: unknown): unknown => {
  if (value === null || value === undefined) return value;

  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (SENSITIVE_KEYS.has(normalizedKey)) {
    return '[REDACTED]';
  }

  if (typeof value === 'object') {
    return sanitizeObject(value);
  }

  return value;
};

const sanitizeObject = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    sanitized[k] = sanitizeValue(k, v);
  }
  return sanitized;
};

class LoggerService {
  private isEnabled: boolean = Config.features.enableDebugLogger;

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public debug(message: string, context?: Record<string, unknown>, correlationId?: string): void {
    if (!this.isEnabled) return;
    this.output('debug', message, context, correlationId);
  }

  public info(message: string, context?: Record<string, unknown>, correlationId?: string): void {
    if (!this.isEnabled && Config.env === 'production') return;
    this.output('info', message, context, correlationId);
  }

  public warn(message: string, context?: Record<string, unknown>, correlationId?: string): void {
    this.output('warn', message, context, correlationId);
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>, correlationId?: string): void {
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
    this.output('error', message, { ...context, error: errorDetails }, correlationId);
  }

  private output(level: LogLevel, message: string, context?: Record<string, unknown>, correlationId?: string): void {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level: level.toUpperCase(),
      message,
      correlationId: correlationId || undefined,
      context: context ? sanitizeObject(context) : undefined,
    };

    const formattedMessage = `[GymDeck:${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'debug':
        if (__DEV__) console.debug(formattedMessage, payload.context ?? '');
        break;
      case 'info':
        if (__DEV__) console.info(formattedMessage, payload.context ?? '');
        break;
      case 'warn':
        console.warn(formattedMessage, payload.context ?? '');
        break;
      case 'error':
        console.error(formattedMessage, payload.context ?? '');
        break;
    }
  }
}

export const Logger = new LoggerService();
export default Logger;
