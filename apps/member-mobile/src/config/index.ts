/**
 * GymDeck Member Mobile - Centralized Application Configuration
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
  if (__DEV__) {
    return 'development';
  }
  // Can be controlled by process.env.APP_ENV in CI/EAS builds
  return 'production';
};

const currentEnv = getEnvironment();

const envConfigs: Record<Environment, AppConfig> = {
  development: {
    env: 'development',
    api: {
      baseUrl: 'http://192.168.31.193:3001',
      version: 'v1',
      timeoutMs: 10000,
      retryLimit: 2,
    },
    features: {
      enableBiometrics: true,
      enablePushNotifications: true,
      enableOfflineCache: true,
      enablePerformanceTelemetry: true,
      enableDebugLogger: true,
    },
    storage: {
      mmkvInstanceId: 'gymdeck_member_dev_storage',
      keychainService: 'com.gymdeck.member.dev',
    },
    app: {
      name: 'GymDeck Member (Dev)',
      version: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.gymdeck.member.dev',
      supportEmail: 'support@gymdeck.com',
    },
  },
  testing: {
    env: 'testing',
    api: {
      baseUrl: 'https://staging-api.gymdeck.com',
      version: 'v1',
      timeoutMs: 15000,
      retryLimit: 2,
    },
    features: {
      enableBiometrics: true,
      enablePushNotifications: true,
      enableOfflineCache: true,
      enablePerformanceTelemetry: true,
      enableDebugLogger: true,
    },
    storage: {
      mmkvInstanceId: 'gymdeck_member_test_storage',
      keychainService: 'com.gymdeck.member.test',
    },
    app: {
      name: 'GymDeck Member (Test)',
      version: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.gymdeck.member.test',
      supportEmail: 'support@gymdeck.com',
    },
  },
  production: {
    env: 'production',
    api: {
      baseUrl: 'https://api.gymdeck.com',
      version: 'v1',
      timeoutMs: 20000,
      retryLimit: 3,
    },
    features: {
      enableBiometrics: true,
      enablePushNotifications: true,
      enableOfflineCache: true,
      enablePerformanceTelemetry: false,
      enableDebugLogger: false,
    },
    storage: {
      mmkvInstanceId: 'gymdeck_member_app_storage',
      keychainService: 'com.gymdeck.member',
    },
    app: {
      name: 'GymDeck Member',
      version: '1.0.0',
      buildNumber: '1',
      bundleId: 'com.gymdeck.member',
      supportEmail: 'support@gymdeck.com',
    },
  },
};

export const Config: AppConfig = envConfigs[currentEnv];
export default Config;
