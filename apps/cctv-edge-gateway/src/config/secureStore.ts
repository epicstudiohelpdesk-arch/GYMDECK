/**
 * GymDeck CCTV Edge Gateway - Hardware-Bound Encrypted Local Config Store
 * Encrypts persistent credentials and gateway state using AES-256-GCM.
 * The master encryption key is derived from the host's hardware fingerprint,
 * preventing credentials from being exfiltrated to another computer.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { gatewayIdentity } from '../identity/gatewayIdentity';

export interface GatewayConfig {
  gatewayId: string;
  gymId: string;
  name: string;
  deviceToken: string;
  enrolledAt: string;
  cloudApiUrl: string;
  privateKey?: string;
  publicKey?: string;
}

export class SecureStore {
  private configPath: string;
  private encryptionKey: Buffer;

  constructor(customPath?: string) {
    const configDir = customPath || path.join(os.homedir(), '.gymdeck');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
    }
    this.configPath = path.join(configDir, 'cctv-gateway-config.enc');

    // Derive machine-bound 256-bit encryption key
    const fingerprint = gatewayIdentity.getFingerprint();
    const keyDerivationInput = `gymdeck_edge_key_v1_${fingerprint.machineId}_${fingerprint.platform}`;
    this.encryptionKey = crypto.createHash('sha256').update(keyDerivationInput).digest();
  }

  /**
   * Encrypts plaintext data using AES-256-GCM with a random 96-bit IV.
   */
  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
  }

  /**
   * Decrypts and verifies AES-256-GCM payload.
   */
  private decrypt(payload: string): string | null {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') return null;
    try {
      const iv = Buffer.from(parts[1]!, 'base64');
      const tag = Buffer.from(parts[2]!, 'base64');
      const ct = Buffer.from(parts[3]!, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Persists configuration encrypted to disk.
   */
  saveConfig(config: GatewayConfig): void {
    const json = JSON.stringify(config, null, 2);
    const encrypted = this.encrypt(json);
    fs.writeFileSync(this.configPath, encrypted, { encoding: 'utf8', mode: 0o600 });
  }

  /**
   * Loads and decrypts configuration.
   */
  loadConfig(): GatewayConfig | null {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    const encrypted = fs.readFileSync(this.configPath, 'utf8');
    const decrypted = this.decrypt(encrypted);
    if (!decrypted) {
      console.warn('[SecureStore] Failed to decrypt gateway configuration. Host hardware mismatch or file corrupted.');
      return null;
    }
    try {
      return JSON.parse(decrypted) as GatewayConfig;
    } catch {
      return null;
    }
  }

  /**
   * Checks if the gateway is already enrolled.
   */
  isEnrolled(): boolean {
    const config = this.loadConfig();
    return Boolean(config && config.gatewayId && config.deviceToken);
  }

  /**
   * Clears configuration (for resetting or re-enrolling).
   */
  clearConfig(): void {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
  }
}

export const secureStore = new SecureStore();
