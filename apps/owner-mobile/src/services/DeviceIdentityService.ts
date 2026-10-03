/**
 * GymDeck Owner Mobile - Device Identity Service
 *
 * Provides a stable, globally unique, hardware-persisted device identity
 * strictly bound to the enrolled vault and device installation.
 *
 * Invariants:
 * - Persistent across app restarts and database reopens.
 * - Does NOT generate a new deviceId for each mutation.
 * - Does NOT use timestamps as device IDs.
 * - Backed by MMKV and mirrored to vault_metadata.
 */

import { MMKV } from 'react-native-mmkv';
import { generateUUID } from '../database/utils';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { Logger } from '../observability';

const storage = new MMKV({ id: 'gymdeck_device_identity' });
const STORAGE_KEY = 'vault_device_id';

export class DeviceIdentityService {
  private static cachedDeviceId: string | null = null;

  /**
   * Returns the stable device ID for outbox event attribution.
   */
  public static async getDeviceId(explicitGymId?: string): Promise<string> {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    // 1. Check MMKV fast persistent storage
    const stored = storage.getString(STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      this.cachedDeviceId = stored;
      return stored;
    }

    // 2. Check vault_metadata if database is initialized
    try {
      const dbManager = LocalDatabaseManager.getInstance();
      if (dbManager.isOpen()) {
        const result = await dbManager.execute(
          'SELECT device_id FROM vault_metadata LIMIT 1;'
        );
        const vaultDeviceId = result.rows?.[0]?.device_id as string | undefined;
        if (vaultDeviceId && vaultDeviceId.trim().length > 0) {
          storage.set(STORAGE_KEY, vaultDeviceId);
          this.cachedDeviceId = vaultDeviceId;
          return vaultDeviceId;
        }
      }
    } catch {
      // Vault metadata query non-blocking if schema still migrating
    }

    // 3. Generate a permanent device identifier
    const newDeviceId = `dev_${generateUUID()}`;
    storage.set(STORAGE_KEY, newDeviceId);
    this.cachedDeviceId = newDeviceId;

    // Persist into vault_metadata if open
    try {
      const dbManager = LocalDatabaseManager.getInstance();
      if (dbManager.isOpen()) {
        await dbManager.execute(
          'UPDATE vault_metadata SET device_id = ?;',
          [newDeviceId]
        );
      }
    } catch (err: any) {
      Logger.warn('[DeviceIdentityService] Could not mirror device_id to vault_metadata:', {
        error: err?.message,
      });
    }

    Logger.info(`[DeviceIdentityService] Initialized persistent device identity: ${newDeviceId}`);
    return newDeviceId;
  }

  /**
   * Synchronous accessor when pre-cached or from MMKV.
   */
  public static getDeviceIdSync(): string {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }
    const stored = storage.getString(STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      this.cachedDeviceId = stored;
      return stored;
    }
    const newId = `dev_${generateUUID()}`;
    storage.set(STORAGE_KEY, newId);
    this.cachedDeviceId = newId;
    return newId;
  }

  /**
   * Test/Dev utility to inspect or set device identity.
   */
  public static setDeviceIdForTesting(id: string | null): void {
    if (id === null) {
      storage.delete(STORAGE_KEY);
      this.cachedDeviceId = null;
    } else {
      storage.set(STORAGE_KEY, id);
      this.cachedDeviceId = id;
    }
  }
}
