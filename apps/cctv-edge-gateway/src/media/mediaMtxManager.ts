/**
 * GymDeck CCTV Subsystem - MediaMTX Supervisor & Lifecycle Manager
 * Oversees binary discovery, configuration provisioning, health monitoring,
 * and automatic crash recovery with bounded exponential backoff.
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MediaEngine, CameraStreamRoute } from './mediaEngine';
import { sanitizeLog } from '../security/sanitizer';
import { MediaMtxPackagingEngine } from '../packaging/mediamtxPackage';

export interface MediaMtxStatus {
  isRunning: boolean;
  pid: number | null;
  binaryPath: string | null;
  configPath: string;
  uptimeSeconds: number;
  restartsCount: number;
  lastError: string | null;
  whepPort: number;
  rtspPort: number;
}

export class MediaMtxManager {
  private child: child_process.ChildProcess | null = null;
  private binaryPath: string | null = null;
  private configPath: string;
  private pidPath: string;
  private whepPort: number;
  private rtspPort: number;
  private isIntentionallyStopped = false;
  private startedAt: number | null = null;
  private restartAttempts = 0;
  private restartTimer: NodeJS.Timeout | null = null;
  private lastError: string | null = null;
  private activeRoutes: Map<string, CameraStreamRoute> = new Map();

  constructor(whepPort = 8889, rtspPort = 8554) {
    this.whepPort = whepPort;
    this.rtspPort = rtspPort;

    const gymdeckDir = path.join(os.homedir(), '.gymdeck');
    if (!fs.existsSync(gymdeckDir)) {
      try {
        fs.mkdirSync(gymdeckDir, { recursive: true, mode: 0o700 });
      } catch {}
    }
    this.configPath = path.join(gymdeckDir, 'mediamtx.yml');
    this.pidPath = path.join(gymdeckDir, 'mediamtx.pid');
    this.binaryPath = this.resolveBinary();
  }

  /**
   * Resolves the MediaMTX executable across standard embedded and system paths.
   */
  public resolveBinary(): string | null {
    const ext = process.platform === 'win32' ? '.exe' : '';
    const binaryName = `mediamtx${ext}`;

    const candidatePaths = [
      // 1. Local project bin directory relative to this file
      path.resolve(__dirname, `../../bin/${binaryName}`),
      // 2. Relative to working directory
      path.resolve(process.cwd(), `bin/${binaryName}`),
      path.resolve(process.cwd(), `apps/cctv-edge-gateway/bin/${binaryName}`),
      // 3. User local bin or system bin
      `/usr/local/bin/${binaryName}`,
      `/opt/homebrew/bin/${binaryName}`,
      path.join(os.homedir(), `.local/bin/${binaryName}`),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          fs.accessSync(p, fs.constants.X_OK);
          return p;
        } catch {}
      }
    }

    // 4. Try checking PATH via which / where
    try {
      const checkCmd = process.platform === 'win32' ? `where ${binaryName}` : `which ${binaryName}`;
      const out = child_process.execSync(checkCmd, { encoding: 'utf8' }).trim().split('\n')[0];
      if (out && fs.existsSync(out)) return out;
    } catch {}

    return null;
  }

  /**
   * Generates or refreshes the MediaMTX YAML configuration file.
   */
  public writeConfig(): void {
    const routes = Array.from(this.activeRoutes.values());
    MediaEngine.writeConfigFile(this.configPath, routes, this.whepPort, this.rtspPort);
  }

  /**
   * Adds or updates a camera route and syncs config to MediaMTX.
   */
  public registerRoute(route: CameraStreamRoute): void {
    this.activeRoutes.set(route.streamId, route);
    this.writeConfig();
  }

  /**
   * Removes a camera route.
   */
  public unregisterRoute(streamId: string): void {
    this.activeRoutes.delete(streamId);
    this.writeConfig();
  }

  /**
   * Starts the supervised MediaMTX binary process.
   */
  public async start(): Promise<boolean> {
    if (this.child && !this.child.killed) {
      return true;
    }

    if (!this.binaryPath || !fs.existsSync(this.binaryPath)) {
      this.binaryPath = this.resolveBinary();
      if (!this.binaryPath) {
        this.lastError = 'MediaMTX binary not found on host machine.';
        console.warn(`[MediaMTX] ${this.lastError}`);
        return false;
      }
    }

    this.isIntentionallyStopped = false;
    this.writeConfig();

    try {
      MediaMtxPackagingEngine.validateAndSetPermissions(this.binaryPath);

      this.child = child_process.spawn(this.binaryPath, [this.configPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      if (this.child.pid) {
        MediaMtxPackagingEngine.acquirePidLock(this.pidPath, this.child.pid);
      }

      this.startedAt = Date.now();
      this.lastError = null;

      this.child.stdout?.on('data', (chunk) => {
        const text = chunk.toString();
        // Redact any leaked credentials from logs
        const safe = sanitizeLog(text);
        if (process.env.DEBUG_MEDIAMTX) {
          process.stdout.write(`[MediaMTX] ${safe}`);
        }
      });

      this.child.stderr?.on('data', (chunk) => {
        const text = chunk.toString();
        const safe = sanitizeLog(text);
        this.lastError = safe.trim();
        console.warn(`[MediaMTX Error] ${safe}`);
      });

      this.child.on('exit', (code, signal) => {
        MediaMtxPackagingEngine.releasePidLock(this.pidPath);
        const wasIntentional = this.isIntentionallyStopped;
        this.child = null;
        this.startedAt = null;

        if (!wasIntentional) {
          console.warn(`[MediaMTX] Process terminated unexpectedly (code: ${code}, signal: ${signal}). Scheduling crash recovery...`);
          this.scheduleRestart();
        } else {
          console.log('[MediaMTX] Process terminated cleanly.');
        }
      });

      // Quick readiness probe
      return await this.waitForReady(3000);
    } catch (err: any) {
      this.lastError = err.message;
      console.error(`[MediaMTX] Failed to launch process: ${err.message}`);
      return false;
    }
  }

  /**
   * Probes for MediaMTX WHEP readiness on loopback.
   */
  private async waitForReady(timeoutMs = 3000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.child) return false;
      try {
        const res = await fetch(`http://127.0.0.1:${this.whepPort}/`, {
          signal: AbortSignal.timeout(300),
        }).catch(() => null);

        // MediaMTX returns 404 for root path or WHEP endpoint, which confirms HTTP server is up
        if (res !== null) {
          this.restartAttempts = 0;
          return true;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    return Boolean(this.child && !this.child.killed);
  }

  /**
   * Bounded exponential backoff restart mechanism.
   */
  private scheduleRestart(): void {
    if (this.isIntentionallyStopped) return;
    this.restartAttempts++;

    const delayMs = Math.min(1000 * Math.pow(2, this.restartAttempts - 1), 30000);
    console.log(`[MediaMTX] Attempting restart in ${delayMs / 1000}s (Attempt ${this.restartAttempts})...`);

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }

    this.restartTimer = setTimeout(() => {
      this.start().catch(() => {});
    }, delayMs);
    this.restartTimer.unref();
  }

  /**
   * Graceful termination of MediaMTX.
   */
  public async stop(): Promise<void> {
    this.isIntentionallyStopped = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (!this.child) return;

    const proc = this.child;
    return new Promise((resolve) => {
      let isDone = false;
      const cleanup = () => {
        if (!isDone) {
          isDone = true;
          MediaMtxPackagingEngine.releasePidLock(this.pidPath);
          this.child = null;
          this.startedAt = null;
          resolve();
        }
      };

      proc.once('exit', cleanup);
      proc.kill('SIGTERM');

      // Fallback to SIGKILL after 3s
      setTimeout(() => {
        if (!isDone) {
          try {
            proc.kill('SIGKILL');
          } catch {}
          cleanup();
        }
      }, 3000);
    });
  }

  /**
   * Returns current process and operational telemetry.
   */
  public getStatus(): MediaMtxStatus {
    const isRunning = Boolean(this.child && !this.child.killed);
    const uptimeSeconds = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;

    return {
      isRunning,
      pid: this.child?.pid || null,
      binaryPath: this.binaryPath,
      configPath: this.configPath,
      uptimeSeconds,
      restartsCount: this.restartAttempts,
      lastError: this.lastError,
      whepPort: this.whepPort,
      rtspPort: this.rtspPort,
    };
  }

  public getWhepPort(): number {
    return this.whepPort;
  }
}

export const mediaMtxManager = new MediaMtxManager();
