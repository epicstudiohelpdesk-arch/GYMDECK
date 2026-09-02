/**
 * GymDeck Cloud Backend - Strongly-Typed Environment Configuration
 */

import { z } from 'zod';

// Load environment variables from .env file if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  if (dotenv && typeof dotenv.config === 'function') {
    dotenv.config();
  }
} catch {
  // Dotenv is optional in production or test environments where process.env is pre-populated
}

export const DEV_DEFAULT_JWT_SECRET = 'gymdeck_default_dev_jwt_secret_must_be_overridden_in_prod';
export const DEV_DEFAULT_DATABASE_URL = 'postgresql://gymdeck_user:gymdeck_password@localhost:5432/gymdeck_cloud?schema=public';

export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('*'),

  // PostgreSQL Database
  DATABASE_URL: z.string().default(DEV_DEFAULT_DATABASE_URL),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(1).default(10),

  // Authentication & Tokens
  JWT_SECRET: z.string().min(16).default(DEV_DEFAULT_JWT_SECRET),
  JWT_ACCESS_EXPIRATION_SECONDS: z.coerce.number().default(900), // 15 minutes
  JWT_REFRESH_EXPIRATION_SECONDS: z.coerce.number().default(604800), // 7 days

  // Resend Email Gateway
  RESEND_API_KEY: z.string().optional().default('re_dev_placeholder_key'),
  RESEND_FROM_EMAIL: z.string().email().default('auth@notifications.gymdeck.com'),

  // External Push Provider (Expo Push)
  EXPO_ACCESS_TOKEN: z.string().optional(),
  EXPO_PUSH_API_URL: z.string().url().default('https://exp.host/--/api/v2/push/send'),

  // WhatsApp Provider (Meta WhatsApp Cloud API)
  WHATSAPP_API_URL: z.string().url().default('https://graph.facebook.com/v22.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default('dev_whatsapp_phone_number_id'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default('dev_whatsapp_access_token'),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default('dev_whatsapp_webhook_verify_token'),
  WHATSAPP_APP_SECRET: z.string().optional().default('dev_whatsapp_app_secret_12345'),

  // Provider Dispatch Mode
  NOTIFICATION_PROVIDER_MODE: z.enum(['live', 'sandbox', 'mock']).default('sandbox'),

  // Redis Cache
  REDIS_URL: z.string().optional(),
}).superRefine((data, ctx) => {
  // 1. Production Security Rules (Fail Closed)
  if (data.NODE_ENV === 'production') {
    if (data.JWT_SECRET === DEV_DEFAULT_JWT_SECRET || data.JWT_SECRET.length < 32 || /dev|placeholder|test/i.test(data.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'Security Violation: Production requires a cryptographically strong, non-development JWT_SECRET of at least 32 characters.',
      });
    }

    if (data.DATABASE_URL === DEV_DEFAULT_DATABASE_URL || /localhost|127\.0\.0\.1/.test(data.DATABASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'Security Violation: Production DATABASE_URL cannot reference local development database or default credentials.',
      });
    }

    if (data.CORS_ORIGINS === '*') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'Security Violation: Wildcard CORS (*) is forbidden in production. Explicit allowed origins required.',
      });
    }

    if (data.NOTIFICATION_PROVIDER_MODE === 'live') {
      if (!data.RESEND_API_KEY || data.RESEND_API_KEY === 're_dev_placeholder_key') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RESEND_API_KEY'],
          message: 'Production live notifications require a valid RESEND_API_KEY.',
        });
      }
    }
  }

  // 2. Staging Security Rules
  if (data.NODE_ENV === 'staging') {
    if (data.JWT_SECRET === DEV_DEFAULT_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'Staging environment must not use the default development JWT secret.',
      });
    }
    if (data.DATABASE_URL === DEV_DEFAULT_DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'Staging environment requires an explicit DATABASE_URL.',
      });
    }
  }
});

export type AppConfig = z.infer<typeof EnvironmentSchema>;

export function validateEnvironmentConfig(env: Record<string, string | undefined> = process.env): {
  success: boolean;
  data?: AppConfig;
  error?: z.ZodError;
} {
  const result = EnvironmentSchema.safeParse(env);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

const parsedConfig = validateEnvironmentConfig(process.env);

if (!parsedConfig.success) {
  console.error('❌ FATAL: Invalid cloud backend environment configuration:');
  console.error(JSON.stringify(parsedConfig.error?.format(), null, 2));
  throw new Error('Invalid environment configuration');
}

export const config: AppConfig = parsedConfig.data!;
export const isDevelopment = config.NODE_ENV === 'development';
export const isStaging = config.NODE_ENV === 'staging';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

export default config;
