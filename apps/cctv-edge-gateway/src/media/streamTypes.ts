/**
 * GymDeck CCTV Subsystem - Media Pipeline Types & Data Contracts
 */

export interface ActiveStream {
  id: string;
  cameraId: string;
  channelNumber: number;
  profile: 'MAIN' | 'SUB';
  rtspSourceUrl: string;
  whepPath: string;
  codec: 'H264' | 'H265';
  resolution: string;
  fps: number;
  activeViewersCount: number;
  status: 'STARTING' | 'STREAMING' | 'RECONNECTING' | 'STOPPED' | 'ERROR';
  bytesIngested: number;
  lastViewerSeenAt: number;
  startedAt: number;
  errorMessage?: string;
}

export interface StreamQualityOptions {
  maxConcurrentStreams: number;
  idleTimeoutSeconds: number;
  reconnectMaxAttempts: number;
  forceTcpTransport: boolean;
  preferredCodec: 'H264' | 'H265';
}

export interface WhepSession {
  sessionId: string;
  streamId: string;
  cameraId: string;
  clientIp: string;
  createdAt: number;
  lastHeartbeatAt: number;
  sdpOffer: string;
  sdpAnswer: string;
}
