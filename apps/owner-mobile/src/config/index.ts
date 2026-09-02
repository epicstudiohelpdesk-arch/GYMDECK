/**
 * GymDeck Owner Mobile - Centralized Application Configuration
 *
 * NOTE: Only PUBLIC, non-sensitive configuration is included here.
 * Never embed API keys, secrets, or database passwords in mobile bundles.
 */

export type Environment = 'development' | 'testing' | 'production';

export interface AppConfig {
  env: Environment;
  api: {
    baseUrl: string;
    version: string;
    timeoutMs: number;
    retryLimit: number;
  };
  auth: {
    refreshThresholdSeconds: number;
  };
  features: {
    enableBiometrics: boolean;
    enablePushNotifications: boolean;
    enableOfflineCache: boolean;
    enablePerformanceTelemetry: boolean;
    enableDebugLogger: boolean;
  };
  storage: {
    mmkvInstanceId: string;
    keychainService: string;
  };
  app: {
    name: string;
    version: string;
    buildNumber: string;
    bundleId: string;
    supportEmail: string;
  };
}

const getEnvironment = (): Environment => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'development';
  }
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV;
  if (appEnv === 'testing' || appEnv === 'staging' || appEnv === 'test') {
    return 'testing';
  }
  return 'production';
};

const currentEnv = getEnvironment();

const envConfigs: Record<Environment, AppConfig> = {
  development: {
    env: 'development',
    api: {
      baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      version: 'v1',
      timeoutMs: 15000,
      retryLimit: 2,
    },
    auth: {
      refreshThresholdSeconds: 120,
    },
    features: {
      enableBiometrics: true,
      enablePushNotifications: true,
      enableOfflineCache: true,
      enablePerformanceTelemetry: true,
      enableDebugLogger: true,
    },
    storage: {
      mmkvInstanceId: 'gymdeck_owner_dev_storage',
      keychainService: 'com.gymdeck.owner.auth.dev',
    },
    app: {
      name: 'GymDeck Owner (Dev)',
      version: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.gymdeck.owner.dev',
      supportEmail: 'support@gymdeck.com',
    },
  },
  testing: {
    env: 'testing',
    api: {
      baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://staging-api.gymdeck.com',
      version: 'v1',
      timeoutMs: 15000,
      retryLimit: 2,
    },
    auth: {
      refreshThresholdSeconds: 120,
    },
    features: {
      enableBiometrics: true,
      enablePushNotifications: true,
      enableOfflineCache: true,
      enablePerformanceTelemetry: true,
      enableDebugLogger: true,
    },
    storage: {
      mmkvInstanceId: 'gymdeck_owner_test_storage',
      keychainService: 'com.gymdeck.owner.auth.test',
    },
    app: {
      name: 'GymDeck Owner (Test)',
      version: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.gymdeck.owner.test',
      supportEmail: 'support@gymdeck.com',
    },
  },
  production: {
    env: 'production',
    api: {
      baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gymdeck.com',
      version: 'v1',
      timeoutMs: 20000,
      retryLimit: 3,
    },
    auth: {
      refreshThresholdSeconds: 120,
    },
    features: {
      enableBiometrics: true,
      enablePushNotifications: true,
      enableOfflineCache: true,
      enablePerformanceTelemetry: false,
      enableDebugLogger: false,
    },
    storage: {
      mmkvInstanceId: 'gymdeck_owner_app_storage',
      keychainService: 'com.gymdeck.owner.auth',
    },
    app: {
      name: 'GymDeck Owner',
      version: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.gymdeck.owner',
      supportEmail: 'support@gymdeck.com',
    },
  },
};

export const Config: AppConfig = envConfigs[currentEnv];
export default Config;
