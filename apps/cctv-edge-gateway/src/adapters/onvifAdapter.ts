/**
 * GymDeck CCTV Edge Gateway - Universal ONVIF Device Adapter (Profile T / S / G)
 */

import { CctvDeviceAdapter, DiscoveredDeviceInfo, DiscoveredChannel } from './baseAdapter';
import { OnvifClient, OnvifCredentials } from '../onvif/onvifClient';

export class OnvifAdapter implements CctvDeviceAdapter {
  readonly brand: string;
  private deviceServiceUrl: string;

  constructor(deviceServiceUrl: string, brand = 'GENERIC_ONVIF') {
    this.deviceServiceUrl = deviceServiceUrl;
    this.brand = brand;
  }

  async testConnection(credentials: OnvifCredentials): Promise<boolean> {
    try {
      const client = new OnvifClient(this.deviceServiceUrl, credentials);
      const info = await client.getDeviceInformation();
      return Boolean(info.manufacturer);
    } catch {
      return false;
    }
  }

  async inspectDevice(credentials: OnvifCredentials): Promise<DiscoveredDeviceInfo> {
    const client = new OnvifClient(this.deviceServiceUrl, credentials);
    const info = await client.getDeviceInformation();
    const caps = await client.getCapabilities();

    return {
      brand: this.brand !== 'GENERIC_ONVIF' ? this.brand : info.manufacturer.toUpperCase(),
      model: info.model,
      serialNumber: info.serialNumber,
      firmwareVersion: info.firmwareVersion,
      totalChannels: 1, // Updated after discovering channels
      supportsOnvifT: true,
      supportsOnvifG: false,
      supportsPtz: caps.supportsPtz,
    };
  }

  async discoverChannels(credentials: OnvifCredentials): Promise<DiscoveredChannel[]> {
    const client = new OnvifClient(this.deviceServiceUrl, credentials);
    const profiles = await client.getProfiles();

    // Group profiles by channel if NVR, or sort by resolution
    // Separate profiles into Main stream (highest resolution) and Sub stream (lower resolution)
    const sorted = [...profiles].sort((a, b) => b.width * b.height - a.width * a.height);
    const mainProfile = sorted[0];
    const subProfile = sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0];

    let mainRtspUrl: string | undefined;
    let subRtspUrl: string | undefined;

    if (mainProfile) {
      try {
        mainRtspUrl = await client.getStreamUri(mainProfile.token);
      } catch {}
    }

    if (subProfile && subProfile.token !== mainProfile?.token) {
      try {
        subRtspUrl = await client.getStreamUri(subProfile.token);
      } catch {}
    } else {
      subRtspUrl = mainRtspUrl;
    }

    const channel: DiscoveredChannel = {
      channelNumber: 1,
      name: 'Camera 1',
      locationZone: 'GENERAL',
      onvifToken: mainProfile?.token,
      mainRtspUrl,
      subRtspUrl,
      codec: mainProfile?.encoding === 'H265' ? 'H265' : 'H264',
      resolutionMain: mainProfile ? `${mainProfile.width}x${mainProfile.height}` : '1920x1080',
      resolutionSub: subProfile ? `${subProfile.width}x${subProfile.height}` : '640x360',
      fps: mainProfile?.frameRate || 15,
      capabilities: {
        supportsOnvifT: true,
        supportsOnvifG: false,
        supportsPtz: false,
        supportsAudio: false,
        supportsMotionEvents: false,
        supportsSubstream: Boolean(subRtspUrl && subRtspUrl !== mainRtspUrl),
        maxFramerate: mainProfile?.frameRate || 30,
      },
    };

    return [channel];
  }
}
