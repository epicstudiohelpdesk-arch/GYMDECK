/**
 * GymDeck Member Mobile - Secure Token Storage Abstraction
 * 
 * Uses react-native-keychain for OS-level hardware-backed secure storage (iOS Keychain / Android Keystore).
 * Provides a guarded development fallback for Expo Go UI prototyping only.
 */

import * as Keychain from 'react-native-keychain';
import { Config } from '../../config';
import { Logger } from '../../observability';
import { AppError } from '../../errors';
import { AuthTokens } from '../../types';

export interface ISecureTokenStorage {
  saveTokens(tokens: AuthTokens): Promise<void>;
  getTokens(): Promise<AuthTokens | null>;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  clearTokens(): Promise<void>;
  saveDeviceSecret(secret: string): Promise<void>;
  getDeviceSecret(): Promise<string | null>;
}

const SERVICE_NAME = Config.storage.keychainService;
const DEVICE_SECRET_SERVICE = `${SERVICE_NAME}.device_secret`;

class SecureTokenStorageImpl implements ISecureTokenStorage {
  // In-memory development fallback for Expo Go where native Keychain is unavailable
  private devFallbackTokens: AuthTokens | null = null;
  private devFallbackDeviceSecret: string | null = null;
  private isNativeAvailable: boolean | null = null;

  private async checkNativeSupport(): Promise<boolean> {
    if (this.isNativeAvailable !== null) return this.isNativeAvailable;

    try {
      if (!Keychain || typeof Keychain.getGenericPassword !== 'function') {
        this.isNativeAvailable = false;
      } else {
        // Quick native call probe to test if native bridge is linked
        await Keychain.getGenericPassword({ service: '__probe_service__' });
        this.isNativeAvailable = true;
      }
    } catch {
      this.isNativeAvailable = false;
    }

    if (!this.isNativeAvailable) {
      if (Config.env === 'production') {
        throw AppError.storage('Native secure storage (Keychain) is required in production.');
      }
      Logger.warn('[SecureTokenStorage] Native Keychain not linked (Running in Expo Go). Using In-Memory Dev Storage.');
    }

    return this.isNativeAvailable;
  }

  public async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      const isNative = await this.checkNativeSupport();
      if (!isNative) {
        this.devFallbackTokens = { ...tokens };
        return;
      }

      const payload = JSON.stringify(tokens);
      await Keychain.setGenericPassword('auth_tokens', payload, {
        service: SERVICE_NAME,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
      });
      Logger.debug('[SecureTokenStorage] Tokens stored securely in OS Keychain.');
    } catch (err) {
      this.isNativeAvailable = false;
      this.devFallbackTokens = { ...tokens };
      if (Config.env === 'production') {
        Logger.error('[SecureTokenStorage] Failed to save tokens to Keychain', err);
        throw AppError.storage('Failed to securely store authentication credentials.');
      }
      Logger.warn('[SecureTokenStorage] Keychain write failed. Fallback to in-memory tokens.');
    }
  }

  public async getTokens(): Promise<AuthTokens | null> {
    try {
      const isNative = await this.checkNativeSupport();
      if (!isNative) {
        return this.devFallbackTokens;
      }

      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_NAME,
      });

      if (!credentials || !credentials.password) {
        return this.devFallbackTokens;
      }

      return JSON.parse(credentials.password) as AuthTokens;
    } catch {
      this.isNativeAvailable = false;
      return this.devFallbackTokens;
    }
  }

  public async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken ?? null;
  }

  public async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken ?? null;
  }

  public async clearTokens(): Promise<void> {
    this.devFallbackTokens = null;
    try {
      const isNative = await this.checkNativeSupport();
      if (isNative) {
        await Keychain.resetGenericPassword({
          service: SERVICE_NAME,
        });
        Logger.debug('[SecureTokenStorage] Secure credentials cleared.');
      }
    } catch {
      this.isNativeAvailable = false;
    }
  }

  public async saveDeviceSecret(secret: string): Promise<void> {
    try {
      const isNative = await this.checkNativeSupport();
      if (!isNative) {
        this.devFallbackDeviceSecret = secret;
        return;
      }

      await Keychain.setGenericPassword('device_secret', secret, {
        service: DEVICE_SECRET_SERVICE,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    } catch {
      this.isNativeAvailable = false;
      this.devFallbackDeviceSecret = secret;
    }
  }

  public async getDeviceSecret(): Promise<string | null> {
    try {
      const isNative = await this.checkNativeSupport();
      if (!isNative) {
        return this.devFallbackDeviceSecret;
      }

      const credentials = await Keychain.getGenericPassword({
        service: DEVICE_SECRET_SERVICE,
      });

      return credentials ? credentials.password : this.devFallbackDeviceSecret;
    } catch {
      this.isNativeAvailable = false;
      return this.devFallbackDeviceSecret;
    }
  }
}

export const SecureTokenStorage = new SecureTokenStorageImpl();
export default SecureTokenStorage;
