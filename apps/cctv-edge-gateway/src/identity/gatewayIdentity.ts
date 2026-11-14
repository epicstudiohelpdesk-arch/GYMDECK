/**
 * GymDeck CCTV Edge Gateway - Device Identity & Hardware Attestation
 * Generates deterministic hardware-bound fingerprints and cryptographic device keys.
 */

import * as os from 'os';
import * as crypto from 'crypto';

export interface HardwareFingerprint {
  machineId: string;
  hostname: string;
  platform: string;
  arch: string;
  cpus: number;
  totalMemoryMb: number;
  primaryMac: string;
  localIp: string;
}

export class GatewayIdentity {
  private static instance: GatewayIdentity;
  private fingerprint: HardwareFingerprint | null = null;

  static getInstance(): GatewayIdentity {
    if (!GatewayIdentity.instance) {
      GatewayIdentity.instance = new GatewayIdentity();
    }
    return GatewayIdentity.instance;
  }

  /**
   * Discovers the primary local LAN IP and MAC address of this gateway host.
   */
  private discoverNetworkDetails(): { primaryMac: string; localIp: string } {
    const interfaces = os.networkInterfaces();
    let primaryMac = '00:00:00:00:00:00';
    let localIp = '127.0.0.1';

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        // Find first non-internal IPv4 interface
        if (!addr.internal && addr.family === 'IPv4') {
          localIp = addr.address;
          if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
            primaryMac = addr.mac;
            return { primaryMac, localIp };
          }
        }
      }
    }

    return { primaryMac, localIp };
  }

  /**
   * Generates or returns the cached hardware fingerprint.
   */
  getFingerprint(): HardwareFingerprint {
    if (this.fingerprint) {
      return this.fingerprint;
    }

    const { primaryMac, localIp } = this.discoverNetworkDetails();
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const cpus = os.cpus().length;
    const totalMemoryMb = Math.round(os.totalmem() / (1024 * 1024));

    // Combine stable hardware properties to derive a persistent machine identifier
    const rawHardwareSeed = `${platform}:${arch}:${cpus}:${primaryMac}:${hostname}`;
    const machineId = crypto.createHash('sha256').update(rawHardwareSeed).digest('hex');

    this.fingerprint = {
      machineId,
      hostname,
      platform,
      arch,
      cpus,
      totalMemoryMb,
      primaryMac,
      localIp,
    };

    return this.fingerprint;
  }

  /**
   * Generates an asymmetric RSA-2048 or Ed25519 keypair for cryptographic device attestation.
   */
  generateDeviceKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
  }
}

export const gatewayIdentity = GatewayIdentity.getInstance();
