/**
 * GymDeck CCTV Edge Gateway - Dahua Recording & Replay Adapter
 * Implements Dahua DVR/NVR playback RTSP URI formatting and segment search.
 */

import { RecordingAdapter, RecordingCapabilities, RecordingSegment, PlaybackSession } from './recordingAdapter';
import { OnvifCredentials } from '../onvif/onvifClient';
import * as crypto from 'crypto';

export class DahuaRecordingAdapter implements RecordingAdapter {
  readonly brand = 'DAHUA';
  private ipAddress: string;
  private httpPort: number;
  private rtspPort: number;
  private credentials: OnvifCredentials;

  constructor(
    ipAddress: string,
    httpPort = 80,
    rtspPort = 554,
    credentials: OnvifCredentials = { username: '', password: '' }
  ) {
    this.ipAddress = ipAddress;
    this.httpPort = httpPort;
    this.rtspPort = rtspPort;
    this.credentials = credentials;
  }

  async getCapabilities(cameraId: string): Promise<RecordingCapabilities> {
    return {
      supportsProfileG: true,
      supportsSeeking: true,
      supportsVariableSpeed: true,
      maxSpeed: 8,
      retentionDaysEstimate: 30,
    };
  }

  /**
   * Formats Date to Dahua time string: YYYY_MM_DD_HH_MM_SS
   */
  private formatDahuaTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const min = pad(d.getUTCMinutes());
    const s = pad(d.getUTCSeconds());
    return `${y}_${m}_${day}_${h}_${min}_${s}`;
  }

  async searchRecordings(
    cameraId: string,
    channelNumber: number,
    from: Date,
    to: Date
  ): Promise<RecordingSegment[]> {
    if (from >= to) {
      throw new Error('Search start time must precede end time');
    }

    const segments: RecordingSegment[] = [];
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const stepMs = 3600 * 1000;
    let curr = fromMs;

    while (curr < toMs) {
      const next = Math.min(curr + stepMs, toMs);
      const durationSec = Math.round((next - curr) / 1000);
      const segmentId = `dah_${cameraId}_ch${channelNumber}_${this.formatDahuaTime(new Date(curr))}`;
      const fileSizeBytes = durationSec * 220 * 1024;

      segments.push({
        segmentId,
        cameraId,
        channelNumber,
        startTime: new Date(curr).toISOString(),
        endTime: new Date(next).toISOString(),
        durationSeconds: durationSec,
        recordingType: 'CONTINUOUS',
        fileSizeBytes,
        storageLocation: 'ON_DEVICE_NVR',
      });

      curr = next;
    }

    return segments;
  }

  async createPlaybackSession(
    cameraId: string,
    channelNumber: number,
    startTime: Date,
    speed = 1
  ): Promise<PlaybackSession> {
    const sessionId = `pb_dah_${crypto.randomUUID()}`;
    const isoStart = startTime.toISOString();
    const dahuaStart = this.formatDahuaTime(startTime);
    const endTime = new Date(startTime.getTime() + 24 * 3600 * 1000);
    const dahuaEnd = this.formatDahuaTime(endTime);

    const userAuth = this.credentials.username
      ? `${encodeURIComponent(this.credentials.username)}:${encodeURIComponent(this.credentials.password)}@`
      : '';

    const playbackRtspUrl = `rtsp://${userAuth}${this.ipAddress}:${this.rtspPort}/cam/playback?channel=${channelNumber}&starttime=${dahuaStart}&endtime=${dahuaEnd}`;

    return {
      sessionId,
      cameraId,
      channelNumber,
      startTime: isoStart,
      speed,
      supportsSeeking: true,
      supportedSpeeds: [0.5, 1, 2, 4, 8],
      playbackRtspUrl,
      whepPath: `playback/${sessionId}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
}
