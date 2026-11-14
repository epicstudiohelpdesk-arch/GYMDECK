/**
 * GymDeck CCTV Subsystem - Safe Data Transfer Mappers (DTOs)
 * Strictly strips passwords, secret tokens, and internal network raw credentials.
 */

export interface GatewayDto {
  id: string;
  gymId: string;
  name: string;
  hostOs: string | null;
  hostLocalIp: string | null;
  version: string;
  status: 'ONLINE' | 'OFFLINE' | 'ENROLLING' | 'REVOKED';
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export function toGatewayDto(row: any): GatewayDto {
  return {
    id: row.id,
    gymId: row.gym_id || row.gymId,
    name: row.name,
    hostOs: row.host_os || row.hostOs,
    hostLocalIp: row.host_local_ip || row.hostLocalIp,
    version: row.version,
    status: row.status,
    lastHeartbeatAt: row.last_heartbeat_at || row.lastHeartbeatAt,
    createdAt: row.created_at || row.createdAt,
  };
}

export interface RecorderDto {
  id: string;
  gatewayId: string;
  gymId: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  firmwareVersion: string | null;
  ipAddress: string;
  onvifPort: number;
  rtspPort: number;
  httpPort: number;
  macAddress: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'AUTH_FAILED';
  totalChannels: number;
  createdAt: string;
}

export function toRecorderDto(row: any): RecorderDto {
  return {
    id: row.id,
    gatewayId: row.gateway_id || row.gatewayId,
    gymId: row.gym_id || row.gymId,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number || row.serialNumber,
    firmwareVersion: row.firmware_version || row.firmwareVersion,
    ipAddress: row.ip_address || row.ipAddress,
    onvifPort: Number(row.onvif_port || row.onvifPort || 80),
    rtspPort: Number(row.rtsp_port || row.rtspPort || 554),
    httpPort: Number(row.http_port || row.httpPort || 80),
    macAddress: row.mac_address || row.macAddress,
    status: row.status,
    totalChannels: Number(row.total_channels || row.totalChannels || 0),
    createdAt: row.created_at || row.createdAt,
  };
}

export interface CameraDto {
  id: string;
  recorderId: string | null;
  gatewayId: string;
  gymId: string;
  channelNumber: number;
  name: string;
  locationZone: string;
  ipAddress: string | null;
  codec: string;
  resolutionMain: string | null;
  resolutionSub: string | null;
  fps: number | null;
  isActive: boolean;
  status: 'STREAMING' | 'IDLE' | 'OFFLINE' | 'ERROR';
  capabilities?: {
    supportsOnvifT: boolean;
    supportsOnvifG: boolean;
    supportsPtz: boolean;
    supportsAudio: boolean;
    supportsMotionEvents: boolean;
    supportsSubstream: boolean;
    maxFramerate: number;
  };
  createdAt: string;
}

export function toCameraDto(row: any, capabilities?: any): CameraDto {
  return {
    id: row.id,
    recorderId: row.recorder_id || row.recorderId || null,
    gatewayId: row.gateway_id || row.gatewayId,
    gymId: row.gym_id || row.gymId,
    channelNumber: Number(row.channel_number || row.channelNumber),
    name: row.name,
    locationZone: row.location_zone || row.locationZone || 'GENERAL',
    ipAddress: row.ip_address || row.ipAddress,
    codec: row.codec || 'H264',
    resolutionMain: row.resolution_main || row.resolutionMain,
    resolutionSub: row.resolution_sub || row.resolutionSub,
    fps: row.fps ? Number(row.fps) : 15,
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    status: row.status || 'IDLE',
    capabilities: capabilities
      ? {
          supportsOnvifT: Boolean(capabilities.supports_onvif_t ?? capabilities.supportsOnvifT ?? true),
          supportsOnvifG: Boolean(capabilities.supports_onvif_g ?? capabilities.supportsOnvifG ?? false),
          supportsPtz: Boolean(capabilities.supports_ptz ?? capabilities.supportsPtz ?? false),
          supportsAudio: Boolean(capabilities.supports_audio ?? capabilities.supportsAudio ?? false),
          supportsMotionEvents: Boolean(capabilities.supports_motion_events ?? capabilities.supportsMotionEvents ?? false),
          supportsSubstream: Boolean(capabilities.supports_substream ?? capabilities.supportsSubstream ?? true),
          maxFramerate: Number(capabilities.max_framerate ?? capabilities.maxFramerate ?? 30),
        }
      : undefined,
    createdAt: row.created_at || row.createdAt,
  };
}
