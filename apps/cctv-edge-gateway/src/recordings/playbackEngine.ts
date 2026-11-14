/**
 * GymDeck CCTV Edge Gateway - Playback Engine
 * Coordinates active playback sessions, timeline seeking, and speed adjustments.
 */

import { PlaybackSession, RecordingSegment, RecordingCapabilities } from './recordingAdapter';
import { RecordingAdapterFactory } from './recordingAdapterFactory';
import { OnvifCredentials } from '../onvif/onvifClient';

export interface PlaybackSessionState extends PlaybackSession {
  ipAddress: string;
  httpPort: number;
  rtspPort: number;
  brand: string;
  credentials: OnvifCredentials;
  status: 'PLAYING' | 'PAUSED' | 'STOPPED';
}

export class PlaybackEngine {
  private sessions: Map<string, PlaybackSessionState> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.reapExpiredSessions(), 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async search(
    brand: string,
    ipAddress: string,
    httpPort: number,
    rtspPort: number,
    credentials: OnvifCredentials,
    cameraId: string,
    channelNumber: number,
    from: Date,
    to: Date
  ): Promise<{ capabilities: RecordingCapabilities; segments: RecordingSegment[] }> {
    const adapter = RecordingAdapterFactory.getAdapter(brand, ipAddress, httpPort, rtspPort, credentials);
    const capabilities = await adapter.getCapabilities(cameraId);
    const segments = await adapter.searchRecordings(cameraId, channelNumber, from, to);
    return { capabilities, segments };
  }

  async startSession(
    brand: string,
    ipAddress: string,
    httpPort: number,
    rtspPort: number,
    credentials: OnvifCredentials,
    cameraId: string,
    channelNumber: number,
    startTime: Date,
    speed = 1
  ): Promise<PlaybackSessionState> {
    const adapter = RecordingAdapterFactory.getAdapter(brand, ipAddress, httpPort, rtspPort, credentials);
    const session = await adapter.createPlaybackSession(cameraId, channelNumber, startTime, speed);

    const state: PlaybackSessionState = {
      ...session,
      ipAddress,
      httpPort,
      rtspPort,
      brand,
      credentials,
      status: 'PLAYING',
    };

    this.sessions.set(session.sessionId, state);
    return state;
  }

  getSession(sessionId: string): PlaybackSessionState | undefined {
    return this.sessions.get(sessionId);
  }

  async seek(sessionId: string, newStartTime: Date): Promise<PlaybackSessionState> {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new Error(`Playback session '${sessionId}' not found or expired`);
    }

    const adapter = RecordingAdapterFactory.getAdapter(
      existing.brand,
      existing.ipAddress,
      existing.httpPort,
      existing.rtspPort,
      existing.credentials
    );

    const refreshed = await adapter.createPlaybackSession(
      existing.cameraId,
      existing.channelNumber,
      newStartTime,
      existing.speed
    );

    existing.startTime = newStartTime.toISOString();
    existing.playbackRtspUrl = refreshed.playbackRtspUrl;
    existing.status = 'PLAYING';
    existing.expiresAt = refreshed.expiresAt;

    this.sessions.set(sessionId, existing);
    return existing;
  }

  setSpeed(sessionId: string, newSpeed: number): PlaybackSessionState {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new Error(`Playback session '${sessionId}' not found or expired`);
    }

    if (!existing.supportedSpeeds.includes(newSpeed)) {
      throw new Error(`Speed ${newSpeed}x is not supported by device. Allowed: ${existing.supportedSpeeds.join(', ')}`);
    }

    existing.speed = newSpeed;
    return existing;
  }

  pause(sessionId: string): PlaybackSessionState {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new Error(`Playback session '${sessionId}' not found`);
    }
    existing.status = 'PAUSED';
    return existing;
  }

  resume(sessionId: string): PlaybackSessionState {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new Error(`Playback session '${sessionId}' not found`);
    }
    existing.status = 'PLAYING';
    return existing;
  }

  stopSession(sessionId: string): boolean {
    const existing = this.sessions.get(sessionId);
    if (!existing) return false;
    existing.status = 'STOPPED';
    return this.sessions.delete(sessionId);
  }

  private reapExpiredSessions(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions.entries()) {
      if (new Date(s.expiresAt).getTime() <= now) {
        this.sessions.delete(id);
      }
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.sessions.clear();
  }
}

export const playbackEngine = new PlaybackEngine();

