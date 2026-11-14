/**
 * GymDeck CCTV Subsystem - COTURN / STUN / TURN Credentials Provider
 * Implements RFC 5766 / RFC 6062 REST API for ephemeral, short-lived TURN credentials.
 * Ensures remote video playback succeeds even across strict symmetric NATs and cellular firewalls.
 */

import * as crypto from 'crypto';
import { config } from '../../shared/config';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RemoteDiagnosticResult {
  localViewingReady: boolean;
  gatewayToCloudConnected: boolean;
  stunResolutionOk: boolean;
  turnRelayAvailable: boolean;
  overallStatus: 'LOCAL_VIEWING_READY' | 'REMOTE_VIEWING_READY' | 'REMOTE_VIEWING_NOT_TESTED' | 'REMOTE_VIEWING_UNAVAILABLE';
  reasons: string[];
}

export class CctvTurnService {
  /**
   * Generates time-windowed HMAC-SHA1 ephemeral TURN credentials.
   * Standard Coturn / RFC 5766 format:
   * username = <timestamp>:<userId>
   * password = Base64(HMAC-SHA1(sharedSecret, username))
   */
  generateEphemeralTurnCredentials(userId: string, ttlSeconds = 86400): { username: string; credential: string } {
    const turnSecret = process.env.TURN_SHARED_SECRET || config.JWT_SECRET || 'gymdeck_cctv_turn_shared_secret';
    const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${expiryTimestamp}:${userId}`;

    const hmac = crypto.createHmac('sha1', turnSecret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    return { username, credential };
  }

  /**
   * Produces the full list of ICE servers (STUN + TURN over UDP, TCP, and TLS Port 443).
   */
  getIceServers(userId: string): IceServerConfig[] {
    const { username, credential } = this.generateEphemeralTurnCredentials(userId);

    const turnHost = process.env.TURN_SERVER_HOST || 'turn.gymdeck.com';
    const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302';

    return [
      // 1. Primary Public STUN Server for direct P2P hole-punching
      {
        urls: [stunServer, `stun:${turnHost}:3478`],
      },
      // 2. Standard TURN Relay over UDP (low latency fallback)
      {
        urls: `turn:${turnHost}:3478?transport=udp`,
        username,
        credential,
      },
      // 3. TURN Relay over TCP (for networks blocking UDP traffic)
      {
        urls: `turn:${turnHost}:3478?transport=tcp`,
        username,
        credential,
      },
      // 4. Secure TURNS Relay over TLS Port 443 (disguised as HTTPS - bypasses corporate firewalls)
      {
        urls: `turns:${turnHost}:443?transport=tcp`,
        username,
        credential,
      },
    ];
  }

  /**
   * Evaluates honest remote diagnostic status.
   */
  evaluateRemoteAccessStatus(params: {
    isGatewayOnline: boolean;
    hasStunResolution: boolean;
    hasTurnConfigured: boolean;
    testedFromRemote: boolean;
  }): RemoteDiagnosticResult {
    const reasons: string[] = [];

    if (!params.isGatewayOnline) {
      reasons.push('Edge Gateway is currently offline or unreachable.');
      return {
        localViewingReady: false,
        gatewayToCloudConnected: false,
        stunResolutionOk: params.hasStunResolution,
        turnRelayAvailable: params.hasTurnConfigured,
        overallStatus: 'REMOTE_VIEWING_UNAVAILABLE',
        reasons,
      };
    }

    if (!params.testedFromRemote) {
      reasons.push('Remote connection has not been verified from an external network yet.');
      return {
        localViewingReady: true,
        gatewayToCloudConnected: true,
        stunResolutionOk: params.hasStunResolution,
        turnRelayAvailable: params.hasTurnConfigured,
        overallStatus: 'REMOTE_VIEWING_NOT_TESTED',
        reasons,
      };
    }

    if (params.hasStunResolution || params.hasTurnConfigured) {
      return {
        localViewingReady: true,
        gatewayToCloudConnected: true,
        stunResolutionOk: params.hasStunResolution,
        turnRelayAvailable: params.hasTurnConfigured,
        overallStatus: 'REMOTE_VIEWING_READY',
        reasons: ['Direct P2P and TURN relay fallback operational.'],
      };
    }

    reasons.push('NAT traversal failed: No STUN reflexive address and no TURN relay server configured.');
    return {
      localViewingReady: true,
      gatewayToCloudConnected: true,
      stunResolutionOk: false,
      turnRelayAvailable: false,
      overallStatus: 'REMOTE_VIEWING_UNAVAILABLE',
      reasons,
    };
  }
}

export const cctvTurnService = new CctvTurnService();
