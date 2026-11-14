/**
 * GymDeck CCTV Edge Gateway - Heartbeat & Telemetry Agent
 * Gathers system resource utilization and reports periodic heartbeats to the Cloud Control Plane.
 */

import * as os from 'os';
import * as fs from 'fs';
import { secureStore } from '../config/secureStore';

export interface TelemetryMetrics {
  cpuUsagePercent: number;
  memoryUsageMb: number;
  diskFreeGb: number;
  activeStreamsCount: number;
  networkInKbps: number;
  networkOutKbps: number;
}

export class HeartbeatAgent {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private consecutiveFailures = 0;
  private activeStreamsCount = 0;

  /**
   * Samples instantaneous CPU utilization.
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type of Object.keys(cpu.times) as (keyof typeof cpu.times)[]) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.round((100 * idle) / total);
    return Math.max(0, Math.min(100, usage || 0));
  }

  /**
   * Samples host memory usage.
   */
  private getMemoryUsageMb(): number {
    const total = os.totalmem();
    const free = os.freemem();
    return Math.round((total - free) / (1024 * 1024));
  }

  /**
   * Estimates free disk space in GB.
   */
  private getDiskFreeGb(): number {
    try {
      const stats = fs.statfsSync('/');
      const freeBytes = stats.bavail * stats.bsize;
      return Math.round(freeBytes / (1024 * 1024 * 1024));
    } catch {
      return 50; // Fallback estimate
    }
  }

  /**
   * Collects current host metrics.
   */
  collectMetrics(): TelemetryMetrics {
    return {
      cpuUsagePercent: this.getCpuUsage(),
      memoryUsageMb: this.getMemoryUsageMb(),
      diskFreeGb: this.getDiskFreeGb(),
      activeStreamsCount: this.activeStreamsCount,
      networkInKbps: 0,
      networkOutKbps: 0,
    };
  }

  setActiveStreamsCount(count: number): void {
    this.activeStreamsCount = count;
  }

  /**
   * Starts periodic heartbeat reporting.
   */
  start(intervalMs = 30000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Send immediate heartbeat on startup
    this.sendHeartbeat().catch(() => {});

    this.timer = setInterval(() => {
      this.sendHeartbeat().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stops heartbeat reporting.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Sends a single heartbeat payload to the cloud.
   */
  async sendHeartbeat(): Promise<boolean> {
    const config = secureStore.loadConfig();
    if (!config || !config.deviceToken) {
      return false;
    }

    const metrics = this.collectMetrics();
    const endpoint = `${config.cloudApiUrl}/v1/cctv/gateways/heartbeat`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.deviceToken}`,
        },
        body: JSON.stringify({
          gatewayId: config.gatewayId,
          metrics,
        }),
      });

      if (res.ok) {
        this.consecutiveFailures = 0;
        return true;
      } else {
        this.consecutiveFailures++;
        return false;
      }
    } catch (err) {
      this.consecutiveFailures++;
      return false;
    }
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
}

export const heartbeatAgent = new HeartbeatAgent();
