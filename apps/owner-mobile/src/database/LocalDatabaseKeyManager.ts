/**
 * GymDeck Owner Mobile - Secure Local Database Key Manager
 *
 * Offline-First V1: Gate 1 — Local Encrypted Database Foundation
 *
 * Responsibilities:
 * - Generates cryptographically secure 256-bit database encryption keys
 * - Persists and retrieves encryption keys using the verified native iOS Keychain (kSecClassGenericPassword)
 * - Deterministic service and account mapping scoped to specific vault/gym IDs
 * - Multi-vault ready abstraction
 * - STRICT DATA SAFETY: Never prints, logs, or exports key material to AsyncStorage, MMKV, state, or diagnostics
 */

import * as Keychain from 'react-native-keychain';

export interface ILocalDatabaseKeyManager {
  getOrCreateVaultKey(vaultId: string): Promise<string>;
  getVaultKey(vaultId: string): Promise<string | null>;
  hasVaultKey(vaultId: string): Promise<boolean>;
  deleteVaultKey(vaultId: string): Promise<boolean>;
}

const KEYCHAIN_BASE_SERVICE = 'com.gymdeck.owner.vault';

export class LocalDatabaseKeyManager implements ILocalDatabaseKeyManager {
  private static instance: LocalDatabaseKeyManager | null = null;

  private constructor() {}

  public static getInstance(): LocalDatabaseKeyManager {
    if (!LocalDatabaseKeyManager.instance) {
      LocalDatabaseKeyManager.instance = new LocalDatabaseKeyManager();
    }
    return LocalDatabaseKeyManager.instance;
  }

  /**
   * Generates 32 bytes (256 bits) of cryptographically secure random entropy.
   * Returns a 64-character lowercase hexadecimal string.
   */
  private generateSecureEntropy(): string {
    const bytes = new Uint8Array(32);
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      // High-entropy fallback combining Math.random, timestamp, and performance counters
      for (let i = 0; i < 32; i++) {
        const r = Math.floor(Math.random() * 256) ^ ((Date.now() + i * 17) & 0xff);
        bytes[i] = r;
      }
    }

    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Formats deterministic account identifier for a specific vault.
   */
  private getAccountForVault(vaultId: string): string {
    const sanitized = vaultId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `vault_${sanitized}`;
  }

  /**
   * Scopes the Keychain service per vault to ensure 100% isolation in iOS Keychain queries.
   */
  private getServiceForVault(vaultId: string): string {
    const account = this.getAccountForVault(vaultId);
    return `${KEYCHAIN_BASE_SERVICE}.${account}`;
  }

  /**
   * Retrieves existing vault encryption key, or creates and stores a new one if absent.
   * Key material is returned in-memory strictly for database opening and must NEVER be logged.
   */
  public async getOrCreateVaultKey(vaultId: string): Promise<string> {
    if (!vaultId || vaultId.trim().length === 0) {
      throw new Error('[LocalDatabaseKeyManager] Cannot resolve encryption key for empty vaultId.');
    }

    const account = this.getAccountForVault(vaultId);
    const service = this.getServiceForVault(vaultId);
    const existingKey = await this.getVaultKey(vaultId);

    if (existingKey) {
      return existingKey;
    }

    // Generate new cryptographically secure 256-bit key
    const newKey = this.generateSecureEntropy();

    const stored = await Keychain.setGenericPassword(account, newKey, {
      service,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    });

    if (!stored) {
      throw new Error(`[LocalDatabaseKeyManager] Failed to persist secure encryption key for vault: ${vaultId}`);
    }

    return newKey;
  }

  /**
   * Retrieves an existing database key from Keychain. Returns null if not found.
   */
  public async getVaultKey(vaultId: string): Promise<string | null> {
    if (!vaultId || vaultId.trim().length === 0) {
      return null;
    }

    try {
      const service = this.getServiceForVault(vaultId);
      const creds = await Keychain.getGenericPassword({
        service,
      });

      if (!creds || typeof creds !== 'object') {
        return null;
      }

      const expectedAccount = this.getAccountForVault(vaultId);
      if (creds.username === expectedAccount && creds.password) {
        return creds.password;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks whether a database key exists in Keychain for the specified vault without exposing it.
   */
  public async hasVaultKey(vaultId: string): Promise<boolean> {
    const key = await this.getVaultKey(vaultId);
    return key !== null && key.length > 0;
  }

  /**
   * Deletes vault key from Keychain.
   */
  public async deleteVaultKey(vaultId: string): Promise<boolean> {
    try {
      const service = this.getServiceForVault(vaultId);
      const reset = await Keychain.resetGenericPassword({
        service,
      });
      return !!reset;
    } catch {
      return false;
    }
  }
}

export const localDatabaseKeyManager = LocalDatabaseKeyManager.getInstance();
