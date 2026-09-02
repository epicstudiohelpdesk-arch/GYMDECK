/**
 * GymDeck Owner Mobile - Safe Logging & Observability (Zero Secrets Leakage)
 */

export class Logger {
  public static info(message: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  }

  public static warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  }

  public static error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error, context ? JSON.stringify(context) : '');
  }

  public static debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
    }
  }
}
