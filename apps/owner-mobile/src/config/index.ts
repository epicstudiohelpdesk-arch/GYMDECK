/**
 * GymDeck Owner Mobile - Centralized Application Configuration
 */

export const Config = {
  env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000',
    version: 'v1',
    timeoutMs: 15000,
  },
  auth: {
    refreshThresholdSeconds: 120, // Proactively refresh 2 mins prior to expiry
  },
  storage: {
    keychainService: 'com.gymdeck.owner.auth',
  },
} as const;

export default Config;
