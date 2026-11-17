/**
 * Cross-Platform MediaMTX Packaging & Checksum Attestation Engine
 *
 * Provides cryptographic verification, platform target resolution,
 * and packaging manifests for official MediaMTX distribution.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface MediaMtxPlatformRelease {
  platform: 'darwin' | 'linux' | 'win32';
  arch: 'x64' | 'arm64';
  archiveName: string;
  binaryName: string;
  sha256: string;
  url: string;
}

export const MEDIAMTX_VERSION = 'v1.21.4';

/**
 * Authoritative cryptographic manifest of official MediaMTX release archives.
 * Verified against GitHub Attestation and checksums.sha256 from bluenviron/mediamtx.
 */
export const MEDIAMTX_RELEASE_MANIFEST: Record<string, MediaMtxPlatformRelease> = {
  'darwin-arm64': {
    platform: 'darwin',
    arch: 'arm64',
    archiveName: `mediamtx_${MEDIAMTX_VERSION}_darwin_arm64.tar.gz`,
    binaryName: 'mediamtx',
    sha256: '20dfa23c1db149b935c2f23439ffbf0820a0ac1d6979a6eb9b21f74fc8376647',
    url: `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_darwin_arm64.tar.gz`,
  },
  'darwin-x64': {
    platform: 'darwin',
    arch: 'x64',
    archiveName: `mediamtx_${MEDIAMTX_VERSION}_darwin_amd64.tar.gz`,
    binaryName: 'mediamtx',
    sha256: 'c8e2423944731bfa11f29029786961492639ffbacd30c0013aa0556a37d112b8',
    url: `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_darwin_amd64.tar.gz`,
  },
  'linux-x64': {
    platform: 'linux',
    arch: 'x64',
    archiveName: `mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz`,
    binaryName: 'mediamtx',
    sha256: 'be0c05d9c8af8338116977e7f1c3fcb409fbf882075e5ab075cf8baad76a59d2',
    url: `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz`,
  },
  'win32-x64': {
    platform: 'win32',
    arch: 'x64',
    archiveName: `mediamtx_${MEDIAMTX_VERSION}_windows_amd64.zip`,
    binaryName: 'mediamtx.exe',
    sha256: '835645b2700ffce4d2b6cb04bfa0aadce95335da6dfc0d7c2114e6da585734f8',
    url: `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_windows_amd64.zip`,
  },
};

export class MediaMtxPackagingEngine {
  /**
   * Computes SHA-256 digest of a buffer or file.
   */
  static computeSha256(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex').toLowerCase();
  }

  /**
   * Verifies cryptographic integrity of an archive against the official release manifest.
   */
  static verifyArchiveIntegrity(platformKey: string, archiveBuffer: Buffer): boolean {
    const entry = MEDIAMTX_RELEASE_MANIFEST[platformKey];
    if (!entry) return false;
    const computed = this.computeSha256(archiveBuffer);
    return computed === entry.sha256;
  }

  /**
   * Resolves the target platform key based on OS and architecture.
   */
  static resolvePlatformKey(platform = process.platform, arch = process.arch): string | null {
    const key = `${platform}-${arch}`;
    return MEDIAMTX_RELEASE_MANIFEST[key] ? key : null;
  }

  /**
   * Inspects binary permissions and ensures executable bit is set on POSIX systems.
   */
  static validateAndSetPermissions(binaryPath: string): { valid: boolean; permissions: string } {
    if (!fs.existsSync(binaryPath)) {
      return { valid: false, permissions: '0000' };
    }
    const stats = fs.statSync(binaryPath);
    const mode = stats.mode & 0o777;

    if (process.platform !== 'win32') {
      // Ensure owner has execute permissions (mode 0755)
      if ((mode & 0o100) === 0) {
        fs.chmodSync(binaryPath, 0o755);
      }
    }

    const updatedStats = fs.statSync(binaryPath);
    return {
      valid: true,
      permissions: (updatedStats.mode & 0o777).toString(8),
    };
  }

  /**
   * PID Lock Manager: Prevents duplicate instances of MediaMTX.
   */
  static acquirePidLock(pidPath: string, currentPid: number): boolean {
    const dir = path.dirname(pidPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(pidPath)) {
      try {
        const existingPid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
        if (!isNaN(existingPid)) {
          // Check if process with this PID is currently running
          try {
            process.kill(existingPid, 0); // throws if process does not exist
            // Process exists! Duplicate instance detected
            return false;
          } catch (_) {
            // Process is dead, stale PID file
          }
        }
      } catch (_) {}
    }

    fs.writeFileSync(pidPath, currentPid.toString(), { encoding: 'utf8', mode: 0o600 });
    return true;
  }

  /**
   * Releases PID lock upon process termination.
   */
  static releasePidLock(pidPath: string): void {
    if (fs.existsSync(pidPath)) {
      try {
        fs.unlinkSync(pidPath);
      } catch (_) {}
    }
  }
}
