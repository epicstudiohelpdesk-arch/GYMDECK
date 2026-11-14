/**
 * GymDeck CCTV Subsystem - Recording Adapter Interface & Data Contracts
 * Defines vendor-independent abstraction for searching recorded footage on DVRs/NVRs
 * and instantiating timestamped RTSP playback sessions.
 */

export interface RecordingSegment {
  segmentId: string;
  cameraId: string;
  channelNumber: number;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  durationSeconds: number;
  recordingType: 'CONTINUOUS' | 'MOTION' | 'MANUAL';
  fileSizeBytes: number;
  storageLocation: 'ON_DEVICE_NVR';
}

export interface PlaybackSession {
  sessionId: string;
  cameraId: string;
  channelNumber: number;
  startTime: string;
  speed: number;
  supportsSeeking: boolean;
  supportedSpeeds: number[];
  playbackRtspUrl: string;
  whepPath: string;
  expiresAt: string;
}

export interface RecordingCapabilities {
  supportsProfileG: boolean;
  supportsSeeking: boolean;
  supportsVariableSpeed: boolean;
  maxSpeed: number;
  retentionDaysEstimate?: number;
}

export interface RecordingAdapter {
  readonly brand: string;
  getCapabilities(cameraId: string): Promise<RecordingCapabilities>;
  searchRecordings(cameraId: string, channelNumber: number, from: Date, to: Date): Promise<RecordingSegment[]>;
  createPlaybackSession(cameraId: string, channelNumber: number, startTime: Date, speed?: number): Promise<PlaybackSession>;
}
