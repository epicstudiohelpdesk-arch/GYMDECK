/**
 * GymDeck CCTV Edge Gateway - Vendor-Independent Device Adapter Interface
 */

import { OnvifCredentials } from '../onvif/onvifClient';

export interface DiscoveredDeviceInfo {
  brand: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  totalChannels: number;
  supportsOnvifT: boolean;
  supportsOnvifG: boolean;
  supportsPtz: boolean;
}

export interface DiscoveredChannel {
  channelNumber: number;
  name: string;
  locationZone: string;
  ipAddress?: string;
  onvifToken?: string;
  mainRtspUrl?: string;
  subRtspUrl?: string;
  codec: 'H264' | 'H265';
  resolutionMain?: string;
  resolutionSub?: string;
  fps?: number;
  capabilities: {
    supportsOnvifT: boolean;
    supportsOnvifG: boolean;
    supportsPtz: boolean;
    supportsAudio: boolean;
    supportsMotionEvents: boolean;
    supportsSubstream: boolean;
    maxFramerate: number;
  };
}

export interface CctvDeviceAdapter {
  readonly brand: string;
  testConnection(credentials: OnvifCredentials): Promise<boolean>;
  inspectDevice(credentials: OnvifCredentials): Promise<DiscoveredDeviceInfo>;
  discoverChannels(credentials: OnvifCredentials): Promise<DiscoveredChannel[]>;
}
