/**
 * GymDeck CCTV Subsystem - Automatic Configuration Engine
 * Automatically evaluates device capabilities, maps camera channels,
 * configures substreams for grid layouts, and optimizes main streams for full-screen inspection.
 */

import { DiscoveredDeviceInfo, DiscoveredChannel } from '../adapters/baseAdapter';

export interface DeviceConfigurationProfile {
  deviceType: 'NVR' | 'DVR' | 'IP_CAMERA';
  brand: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  totalChannels: number;
  channels: DiscoveredChannel[];
  defaults: {
    gridStreamProfile: 'SUB';
    fullscreenStreamProfile: 'MAIN';
    preferredCodec: 'H264' | 'H265';
    substreamResolution: string;
    substreamFps: number;
  };
}

export class AutoConfigEngine {
  /**
   * Produces an optimal, non-technical configuration profile for a discovered device.
   */
  static configure(info: DiscoveredDeviceInfo, channels: DiscoveredChannel[]): DeviceConfigurationProfile {
    // Determine device type
    const channelCount = channels.length > 0 ? channels.length : info.totalChannels;
    const deviceType: 'NVR' | 'DVR' | 'IP_CAMERA' = channelCount > 1 ? 'NVR' : 'IP_CAMERA';

    // Friendly location zone suggestions
    const defaultZoneMap: Record<number, { name: string; zone: string }> = {
      1: { name: 'Reception & Entrance', zone: 'RECEPTION' },
      2: { name: 'Main Workout Floor', zone: 'WORKOUT_FLOOR' },
      3: { name: 'Free Weights Area', zone: 'WEIGHTS' },
      4: { name: 'Cardio Deck', zone: 'CARDIO' },
      5: { name: 'Billing & Front Counter', zone: 'BILLING' },
      6: { name: 'Facility Entrance', zone: 'ENTRANCE' },
      7: { name: 'Studio & Functional Area', zone: 'GENERAL' },
      8: { name: 'Exterior / Parking', zone: 'EXTERIOR' },
    };

    const optimizedChannels = channels.map((ch) => {
      const suggested = defaultZoneMap[ch.channelNumber] || {
        name: `Camera ${ch.channelNumber}`,
        zone: 'GENERAL',
      };

      return {
        ...ch,
        name: ch.name.startsWith('Camera') ? suggested.name : ch.name,
        locationZone: ch.locationZone === 'GENERAL' ? suggested.zone : ch.locationZone,
        // Ensure robust defaults for grid vs fullscreen
        resolutionMain: ch.resolutionMain || '1920x1080',
        resolutionSub: ch.resolutionSub || '640x360',
        fps: ch.fps || 15,
      };
    });

    return {
      deviceType,
      brand: info.brand,
      model: info.model,
      serialNumber: info.serialNumber,
      firmwareVersion: info.firmwareVersion,
      totalChannels: channelCount,
      channels: optimizedChannels,
      defaults: {
        gridStreamProfile: 'SUB',
        fullscreenStreamProfile: 'MAIN',
        preferredCodec: 'H264',
        substreamResolution: '640x360',
        substreamFps: 15,
      },
    };
  }
}
