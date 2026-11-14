/**
 * GymDeck CCTV Edge Gateway - Cloud Enrollment Client
 * Performs initial handshake using a one-time enrollment token to register this gateway.
 */

import { gatewayIdentity } from '../identity/gatewayIdentity';
import { secureStore, GatewayConfig } from '../config/secureStore';

export interface EnrollmentResult {
  success: boolean;
  gatewayId?: string;
  gymId?: string;
  error?: string;
}

export class EnrollmentClient {
  /**
   * Enrolls this edge gateway with the GymDeck Cloud API using an enrollment token.
   */
  async enroll(enrollmentToken: string, cloudApiUrl: string): Promise<EnrollmentResult> {
    try {
      const fingerprint = gatewayIdentity.getFingerprint();
      const { publicKey, privateKey } = gatewayIdentity.generateDeviceKeyPair();

      const normalizedBaseUrl = cloudApiUrl.replace(/\/$/, '');
      const enrollEndpoint = `${normalizedBaseUrl}/v1/cctv/gateways/enroll`;

      const payload = {
        token: enrollmentToken.trim(),
        hostInfo: {
          name: `Gateway-${fingerprint.hostname}`,
          hostOs: fingerprint.platform.toUpperCase(),
          hostLocalIp: fingerprint.localIp,
          version: '1.0.0',
        },
        publicKey,
      };

      const response = await fetch(enrollEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `GymDeck-CCTV-Gateway/1.0.0 (${fingerprint.platform}; ${fingerprint.arch})`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || `Enrollment failed with HTTP status ${response.status}`,
        };
      }

      const { gatewayId, gymId, deviceToken } = data.data;

      const config: GatewayConfig = {
        gatewayId,
        gymId,
        name: `Gateway-${fingerprint.hostname}`,
        deviceToken,
        enrolledAt: new Date().toISOString(),
        cloudApiUrl: normalizedBaseUrl,
        privateKey,
        publicKey,
      };

      secureStore.saveConfig(config);

      return {
        success: true,
        gatewayId,
        gymId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error communicating with GymDeck Cloud API',
      };
    }
  }
}

export const enrollmentClient = new EnrollmentClient();
