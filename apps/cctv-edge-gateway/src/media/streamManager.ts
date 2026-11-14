/**
 * GymDeck CCTV Edge Gateway - Stream Ingestion & Lifecycle Manager
 * Handles RTSP ingestion pools, on-demand activation, idle cleanup, and stream limits.
 */

import { ActiveStream, StreamQualityOptions } from './streamTypes';

export class StreamManager {
  private activeStreams: Map<string, ActiveStream> = new Map();
  private options: StreamQualityOptions;
  private reaperInterval: NodeJS.Timeout | null = null;

  constructor(options?: Partial<StreamQualityOptions>) {
    this.options = {
      maxConcurrentStreams: options?.maxConcurrentStreams || 16,
      idleTimeoutSeconds: options?.idleTimeoutSeconds || 30,
      reconnectMaxAttempts: options?.reconnectMaxAttempts || 5,
      forceTcpTransport: options?.forceTcpTransport !== false,
      preferredCodec: options?.preferredCodec || 'H264',
    };

    this.startIdleReaper();
  }

  /**
   * Registers a camera stream profile into the active pool.
   * If the stream is already registered, increments viewer count and updates timestamp.
   */
  requestStream(
    cameraId: string,
    channelNumber: number,
    profile: 'MAIN' | 'SUB',
    rtspUrl: string,
    resolution = '640x360',
    fps = 15
  ): ActiveStream {
    const streamId = `${cameraId}_${profile.toLowerCase()}`;
    const now = Date.now();

    if (this.activeStreams.has(streamId)) {
      const stream = this.activeStreams.get(streamId)!;
      stream.activeViewersCount++;
      stream.lastViewerSeenAt = now;
      stream.status = 'STREAMING';
      return stream;
    }

    // Enforce concurrent stream capacity limits
    if (this.activeStreams.size >= this.options.maxConcurrentStreams) {
      // Find least recently used stream with 0 viewers to evict
      let evicted = false;
      for (const [id, s] of this.activeStreams.entries()) {
        if (s.activeViewersCount === 0) {
          this.activeStreams.delete(id);
          evicted = true;
          break;
        }
      }

      if (!evicted) {
        throw new Error(
          `CCTV Stream Capacity Reached: Maximum ${this.options.maxConcurrentStreams} concurrent streams active.`
        );
      }
    }

    const newStream: ActiveStream = {
      id: streamId,
      cameraId,
      channelNumber,
      profile,
      rtspSourceUrl: rtspUrl,
      whepPath: `/whep/${streamId}`,
      codec: 'H264',
      resolution: profile === 'MAIN' ? '1920x1080' : resolution,
      fps: profile === 'MAIN' ? 25 : fps,
      activeViewersCount: 1,
      status: 'STREAMING',
      bytesIngested: 0,
      lastViewerSeenAt: now,
      startedAt: now,
    };

    this.activeStreams.set(streamId, newStream);
    return newStream;
  }

  /**
   * Called when a viewer disconnects from a stream.
   */
  releaseStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    stream.activeViewersCount = Math.max(0, stream.activeViewersCount - 1);
    stream.lastViewerSeenAt = Date.now();
  }

  /**
   * Returns active stream by stream ID.
   */
  getStream(streamId: string): ActiveStream | undefined {
    return this.activeStreams.get(streamId);
  }

  /**
   * Returns all active streams.
   */
  getAllActiveStreams(): ActiveStream[] {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Returns count of active streaming sessions.
   */
  getActiveStreamsCount(): number {
    return Array.from(this.activeStreams.values()).filter((s) => s.status === 'STREAMING').length;
  }

  /**
   * Idle reaper reaps streams that have had 0 viewers for longer than idleTimeoutSeconds.
   */
  private startIdleReaper(): void {
    this.reaperInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.options.idleTimeoutSeconds * 1000;

      for (const [id, stream] of this.activeStreams.entries()) {
        if (stream.activeViewersCount === 0 && stream.lastViewerSeenAt < cutoff) {
          stream.status = 'STOPPED';
          this.activeStreams.delete(id);
        }
      }
    }, 10000);
    this.reaperInterval.unref();
  }

  stop(): void {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
      this.reaperInterval = null;
    }
    this.activeStreams.clear();
  }
}

export const streamManager = new StreamManager();
