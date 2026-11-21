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

  // WhatsApp Provider. GymDeck now ships the OpenWA gateway as the messaging
  // engine; the Cloud API settings below remain only for reading legacy rows.
  WHATSAPP_PROVIDER: z.enum(['openwa']).default('openwa'),
  OPENWA_API_URL: z.string().url().default('http://127.0.0.1:2785/api'),
  OPENWA_API_KEY: z.string().optional().default('dev_openwa_api_key_change_me_32chars'),
  OPENWA_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default('dev_openwa_webhook_secret_32chars'),
  // Public URL OpenWA should POST events to. When empty, the GymDeck backend
  // derives it from the incoming request origin (local development) or from
  // WHATSAPP_PUBLIC_WEBHOOK_URL.
  OPENWA_WEBHOOK_URL: z
    .string()
    .optional()
    .default('http://127.0.0.1:3001/v1/webhooks/openwa'),
  OPENWA_REQUEST_TIMEOUT_MS: z.coerce.number().min(1000).max(120000).default(30000),
  OPENWA_SESSION_PREFIX: z.string().optional().default('gymdeck'),
  OPENWA_ENGINE: z.enum(['whatsapp-web.js', 'baileys']).optional().default('whatsapp-web.js'),

  // Postal Email Gateway Infrastructure
  POSTAL_API_URL: z.string().url().default('http://127.0.0.1:5000/api/v1'),
  POSTAL_SERVER_API_KEY: z.string().optional().default('dev_postal_server_api_key_gymdeck'),
  POSTAL_WEBHOOK_KEY: z.string().optional().default('dev_postal_webhook_signing_key'),
  POSTAL_SIGNING_PUBLIC_KEY: z.string().optional(),
  POSTAL_SIGNING_KEY_ID: z.string().optional(),
  POSTAL_AUTHORIZED_PUBLIC_KEYS: z.string().optional(),
  POSTAL_ALLOW_LEGACY_SHA1: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return Boolean(val);
    }, z.boolean())
    .default(false),
  POSTAL_FROM_DOMAIN: z.string().default('mail.epic-studio.in'),
  POSTAL_DEFAULT_FROM_NAME: z.string().default('GymDeck'),
  POSTAL_DEFAULT_FROM_EMAIL: z.string().default('notifications@mail.epic-studio.in'),
  POSTAL_DELIVERY_MODE: z.enum(['live', 'mock']).default('mock'),
  EMAIL_MONTHLY_QUOTA_DEFAULT: z.coerce.number().min(1).max(100000).default(300),
  EMAIL_WORKER_INTERVAL_MS: z.coerce.number().min(500).max(300000).default(5000),
  EMAIL_BATCH_SIZE: z.coerce.number().min(1).max(100).default(25),

  // Controlled Staging Live Email Testing Safeguards (Phase 4H)
  EMAIL_STAGING_LIVE_TEST_ENABLED: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return Boolean(val);
    }, z.boolean())
    .default(false),
  EMAIL_STAGING_AUTHORIZED_RECIPIENTS: z
    .string()
    .default('')
    .transform((val) => val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)),
  EMAIL_STAGING_DAILY_LIMIT: z.coerce.number().min(1).max(100).default(10),

  // Meta credentials used only by the legacy notification-provider module, not
  // by the Communication Hub (which is OpenWA-only).
  WHATSAPP_API_URL: z.string().url().default('https://graph.facebook.com/v22.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default('dev_whatsapp_phone_number_id'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default('dev_whatsapp_access_token'),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default('dev_whatsapp_webhook_verify_token'),
  WHATSAPP_APP_SECRET: z.string().optional().default('dev_whatsapp_app_secret_12345'),

  WHATSAPP_DEFAULT_COUNTRY_CODE: z.string().optional().default('91'),
  WHATSAPP_MAX_SENDS_PER_HOUR: z.coerce.number().min(1).max(10000).default(200),
  WHATSAPP_QUEUE_BATCH_SIZE: z.coerce.number().min(1).max(200).default(25),
  WHATSAPP_WORKER_INTERVAL_MS: z.coerce.number().min(1000).max(600000).default(15000),
  WHATSAPP_TEST_RECIPIENT: z.string().optional().default(''),

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

    if (data.WHATSAPP_PROVIDER === 'openwa') {
      if (
        !data.OPENWA_API_KEY ||
        data.OPENWA_API_KEY.length < 16 ||
        /dev_openwa|change_me|placeholder/i.test(data.OPENWA_API_KEY)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OPENWA_API_KEY'],
          message: 'Production requires a strong OPENWA_API_KEY of at least 16 characters.',
        });
      }
      if (
        !data.OPENWA_WEBHOOK_SECRET ||
        data.OPENWA_WEBHOOK_SECRET.length < 16 ||
        /dev_openwa|change_me|placeholder/i.test(data.OPENWA_WEBHOOK_SECRET)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OPENWA_WEBHOOK_SECRET'],
          message: 'Production requires a strong OPENWA_WEBHOOK_SECRET of at least 16 characters.',
        });
      }
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
