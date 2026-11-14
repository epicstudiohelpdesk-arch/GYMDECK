/**
 * GymDeck CCTV Edge Gateway - Adapter Selection Factory
 * Dynamically selects the highest-fidelity adapter based on detected vendor profiles.
 */

import { CctvDeviceAdapter } from './baseAdapter';
import { OnvifAdapter } from './onvifAdapter';
import { HikvisionAdapter } from './hikvisionAdapter';
import { DahuaAdapter } from './dahuaAdapter';

export class AdapterFactory {
  static getAdapter(ipAddress: string, brand?: string, xaddr?: string): CctvDeviceAdapter {
    const normalizedBrand = (brand || '').toUpperCase();

    if (normalizedBrand === 'HIKVISION') {
      return new HikvisionAdapter(ipAddress);
    }

    if (normalizedBrand === 'DAHUA' || normalizedBrand === 'CP_PLUS') {
      return new DahuaAdapter(ipAddress, normalizedBrand);
    }

    // Default to universal ONVIF Profile T / S
    const serviceUrl = xaddr || `http://${ipAddress}:80/onvif/device_service`;
    return new OnvifAdapter(serviceUrl, normalizedBrand || 'GENERIC_ONVIF');
  }
}
