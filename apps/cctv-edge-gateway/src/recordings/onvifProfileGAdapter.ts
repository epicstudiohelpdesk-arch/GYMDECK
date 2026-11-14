/**
 * GymDeck CCTV Edge Gateway - ONVIF Profile G Recording & Replay Adapter
 * Implements recording search and playback URI generation per ONVIF Profile G specifications.
 */

import { RecordingAdapter, RecordingCapabilities, RecordingSegment, PlaybackSession } from './recordingAdapter';
import { OnvifCredentials } from '../onvif/onvifClient';
import * as crypto from 'crypto';

export class OnvifProfileGAdapter implements RecordingAdapter {
  readonly brand = 'ONVIF_PROFILE_G';
  private ipAddress: string;
  private httpPort: number;
  private rtspPort: number;
  private credentials: OnvifCredentials;

  constructor(ipAddress: string, httpPort = 80, rtspPort = 554, credentials: OnvifCredentials = { username: '', password: '' }) {
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
   * Searches for recorded footage segments between two timestamps.
   * Simulates ONVIF Search Service FindRecordings / GetRecordingSearchResults parsing.
   */
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
    const totalDurationMs = toMs - fromMs;

    // Create realistic 1-hour recording chunk slices across the query window
    const chunkSizeMs = 3600 * 1000;
    let currentStartMs = fromMs;

    while (currentStartMs < toMs) {
      const currentEndMs = Math.min(currentStartMs + chunkSizeMs, toMs);
      const segmentDurationSec = Math.round((currentEndMs - currentStartMs) / 1000);
      const segmentId = `rec_${cameraId}_ch${channelNumber}_${currentStartMs}_${currentEndMs}`;

      // Typical bitrate ~ 2 Mbps for 1080p continuous recording: ~250 KB/s
      const estimatedBytes = segmentDurationSec * 256 * 1024;

      segments.push({
        segmentId,
        cameraId,
        channelNumber,
        startTime: new Date(currentStartMs).toISOString(),
        endTime: new Date(currentEndMs).toISOString(),
        durationSeconds: segmentDurationSec,
        recordingType: 'CONTINUOUS',
        fileSizeBytes: estimatedBytes,
        storageLocation: 'ON_DEVICE_NVR',
      });

      currentStartMs = currentEndMs;
    }

    return segments;
  }

  /**
   * Instantiates a playback session for a camera starting at an exact timestamp.
   * Formats standard ONVIF replay RTSP URI with range/scale controls.
   */
  async createPlaybackSession(
    cameraId: string,
    channelNumber: number,
    startTime: Date,
    speed = 1
  ): Promise<PlaybackSession> {
    const sessionId = `pb_${crypto.randomUUID()}`;
    const isoStart = startTime.toISOString();

    // Construct ONVIF standard replay RTSP URI
    const userAuth = this.credentials.username
      ? `${encodeURIComponent(this.credentials.username)}:${encodeURIComponent(this.credentials.password)}@`
      : '';
    const playbackRtspUrl = `rtsp://${userAuth}${this.ipAddress}:${this.rtspPort}/onvif-replay?channel=${channelNumber}&starttime=${encodeURIComponent(isoStart)}&scale=${speed}`;

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
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min lease
    };
  }
}
