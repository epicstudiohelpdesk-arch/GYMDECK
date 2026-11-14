/**
 * GymDeck CCTV Edge Gateway - Recording Adapter Factory
 * Dispatches to vendor-specific recording adapter or standards-based ONVIF Profile G.
 */

import { RecordingAdapter } from './recordingAdapter';
import { OnvifProfileGAdapter } from './onvifProfileGAdapter';
import { HikvisionRecordingAdapter } from './hikvisionRecordingAdapter';
import { DahuaRecordingAdapter } from './dahuaRecordingAdapter';
import { OnvifCredentials } from '../onvif/onvifClient';

export class RecordingAdapterFactory {
  static getAdapter(
    brand: string,
    ipAddress: string,
    httpPort = 80,
    rtspPort = 554,
    credentials: OnvifCredentials = { username: '', password: '' }
  ): RecordingAdapter {
    const norm = (brand || '').toUpperCase().trim();

    if (norm.includes('HIKVISION') || norm.includes('HILOOK') || norm.includes('EZVIZ')) {
      return new HikvisionRecordingAdapter(ipAddress, httpPort, rtspPort, credentials);
    }

    if (norm.includes('DAHUA') || norm.includes('IMOU') || norm.includes('LOREX')) {
      return new DahuaRecordingAdapter(ipAddress, httpPort, rtspPort, credentials);
    }

    // Default to standards-based ONVIF Profile G
    return new OnvifProfileGAdapter(ipAddress, httpPort, rtspPort, credentials);
  }
}
