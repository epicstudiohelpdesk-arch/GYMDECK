/**
 * GymDeck Member Mobile - High-Performance Local Storage Abstraction
 * 
 * Uses react-native-mmkv for ultra-fast C++ JSI synchronous key-value storage.
 * Provides an in-memory dev fallback when executed in Expo Go without native binaries.
 */

import { MMKV } from 'react-native-mmkv';
import { Config } from '../../config';
import { Logger } from '../../observability';

export interface IFastAppStorage {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  getNumber(key: string): number | null;
  setNumber(key: string, value: number): void;
  getBoolean(key: string): boolean | null;
  setBoolean(key: string, value: boolean): void;
  getObject<T>(key: string): T | null;
  setObject<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clearAll(): void;
}

class FastAppStorageImpl implements IFastAppStorage {
  private mmkvInstance: MMKV | null = null;
  private devMemoryMap = new Map<string, string>();
  private isNativeAvailable: boolean = false;

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    try {
      this.mmkvInstance = new MMKV({
        id: Config.storage.mmkvInstanceId,
      });
      // Probe
      this.mmkvInstance.getString('__probe__');
      this.isNativeAvailable = true;
      Logger.debug('[FastAppStorage] Native MMKV instance initialized successfully.');
    } catch {
      this.isNativeAvailable = false;
      this.mmkvInstance = null;
      Logger.warn('[FastAppStorage] Native MMKV not available. Using In-Memory Dev Fallback.');
    }
  }

  public getString(key: string): string | null {
    if (this.isNativeAvailable && this.mmkvInstance) {
      return this.mmkvInstance.getString(key) ?? null;
    }
    return this.devMemoryMap.get(key) ?? null;
  }

  public setString(key: string, value: string): void {
    if (this.isNativeAvailable && this.mmkvInstance) {
      this.mmkvInstance.set(key, value);
      return;
    }
    this.devMemoryMap.set(key, value);
  }

  public getNumber(key: string): number | null {
    if (this.isNativeAvailable && this.mmkvInstance) {
      const val = this.mmkvInstance.getNumber(key);
      return val !== undefined && !isNaN(val) ? val : null;
    }
    const str = this.devMemoryMap.get(key);
    if (!str) return null;
    const parsed = Number(str);
    return isNaN(parsed) ? null : parsed;
  }

  public setNumber(key: string, value: number): void {
    if (this.isNativeAvailable && this.mmkvInstance) {
      this.mmkvInstance.set(key, value);
      return;
    }
    this.devMemoryMap.set(key, String(value));
  }

  public getBoolean(key: string): boolean | null {
    if (this.isNativeAvailable && this.mmkvInstance) {
      const val = this.mmkvInstance.getBoolean(key);
      return val !== undefined ? val : null;
    }
    const str = this.devMemoryMap.get(key);
    if (str === 'true') return true;
    if (str === 'false') return false;
    return null;
  }

  public setBoolean(key: string, value: boolean): void {
    if (this.isNativeAvailable && this.mmkvInstance) {
      this.mmkvInstance.set(key, value);
      return;
    }
    this.devMemoryMap.set(key, String(value));
  }

  public getObject<T>(key: string): T | null {
    const raw = this.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public setObject<T>(key: string, value: T): void {
    try {
      const raw = JSON.stringify(value);
      this.setString(key, raw);
    } catch (err) {
      Logger.error(`[FastAppStorage] Failed to serialize object for key ${key}`, err);
    }
  }

  public removeItem(key: string): void {
    if (this.isNativeAvailable && this.mmkvInstance) {
      this.mmkvInstance.delete(key);
      return;
    }
    this.devMemoryMap.delete(key);
  }

  public clearAll(): void {
    if (this.isNativeAvailable && this.mmkvInstance) {
      this.mmkvInstance.clearAll();
      return;
    }
    this.devMemoryMap.clear();
  }
}

export const FastAppStorage = new FastAppStorageImpl();
export default FastAppStorage;
