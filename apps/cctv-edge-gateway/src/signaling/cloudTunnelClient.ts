/**
 * GymDeck CCTV Edge Gateway - Cloud Signaling Tunnel Client
 * Establishes an authenticated outbound persistent WebSocket connection to GymDeck Cloud.
 * Enables zero-port-forwarding remote WebRTC video streaming.
 */

import { WebSocket } from 'ws';
import { secureStore } from '../config/secureStore';
import { whepGateway } from '../media/whepGateway';
import { streamManager } from '../media/streamManager';
import { gatewayIdentity } from '../identity/gatewayIdentity';

export interface TunnelStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnectedAt?: number;
  lastPingAt?: number;
}

export class CloudTunnelClient {
  private ws: WebSocket | null = null;
  private isRunning = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private status: TunnelStatus = { isConnected: false, reconnectAttempts: 0 };

  /**
   * Starts the outbound cloud signaling tunnel.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connect();
  }

  /**
   * Connects to the GymDeck Cloud signaling WebSocket server.
   */
  connect(customUrl?: string): void {
    const config = secureStore.loadConfig();
    if (!config || !config.deviceToken) {
      console.warn('[CloudTunnel] Gateway not enrolled. Skipping cloud tunnel connection.');
      return;
    }

    let wsUrl = customUrl;
    if (!wsUrl) {
      const httpUrl = new URL(config.cloudApiUrl);
      const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${httpUrl.host}/v1/cctv/signaling`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.status.isConnected = true;
        this.status.lastConnectedAt = Date.now();
        this.status.reconnectAttempts = 0;
        this.reconnectAttempts = 0;

        console.log('[CloudTunnel] Connected to GymDeck Cloud signaling server. Sending attestation handshake...');

        // 1. Send Gateway Hello with permanent device token
        this.send({
          type: 'GATEWAY_HELLO',
          token: config.deviceToken,
        });

        // 2. Start keep-alive ping every 25 seconds
        this.startKeepAlive();
      });

      this.ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          await this.handleMessage(msg);
        } catch (err: any) {
          console.error('[CloudTunnel] Error processing signaling message:', err.message);
        }
      });

      this.ws.on('close', () => {
        this.status.isConnected = false;
        this.stopKeepAlive();
        console.warn('[CloudTunnel] Disconnected from cloud signaling. Scheduling reconnect...');
        this.scheduleReconnect(customUrl);
      });

      this.ws.on('error', (err) => {
        console.error('[CloudTunnel] WebSocket error:', err.message);
      });
    } catch (err: any) {
      console.error('[CloudTunnel] Connection initiation error:', err.message);
      this.scheduleReconnect(customUrl);
    }
  }

  /**
   * Handles messages received from Cloud Signaling (relayed from remote viewers).
   */
  private async handleMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'GATEWAY_HELLO_ACK': {
        console.log(`✅ [CloudTunnel] Attestation verified. Gateway active on Cloud Control Plane (Gym: ${msg.gymId})`);
        break;
      }

      case 'SDP_OFFER': {
        const { sessionId, cameraId, streamProfile, sdp } = msg;
        const profile = (streamProfile || 'SUB').toUpperCase() as 'MAIN' | 'SUB';
        const streamId = `${cameraId}_${profile.toLowerCase()}`;

        console.log(`[CloudTunnel] Received remote SDP Offer for camera ${cameraId} (session: ${sessionId}, profile: ${profile})`);

        // Handle offer through local WHEP gateway
        const localIp = gatewayIdentity.getFingerprint().localIp;
        const result = whepGateway.handleOffer(streamId, sdp, 'REMOTE_CLIENT', localIp);

        // Send back SDP Answer
        this.send({
          type: 'SDP_ANSWER',
          sessionId,
          sdp: result.sdpAnswer,
        });

        console.log(`[CloudTunnel] Returned SDP Answer for session ${sessionId}`);
        break;
      }

      case 'ICE_CANDIDATE': {
        // Forward ICE candidate to local peer connection if necessary
        break;
      }

      case 'PONG': {
        this.status.lastPingAt = Date.now();
        break;
      }

      case 'ERROR': {
        console.error(`[CloudTunnel] Cloud Signaling reported error: ${msg.error}`);
        break;
      }
    }
  }

  private send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'PING' });
    }, 25000);
    this.pingInterval.unref();
  }

  private stopKeepAlive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(customUrl?: string): void {
    if (!this.isRunning) return;
    this.reconnectAttempts++;
    this.status.reconnectAttempts = this.reconnectAttempts;

    // Exponential backoff: 1s, 2s, 4s, 8s, up to 30s
    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[CloudTunnel] Reconnecting in ${backoffMs / 1000}s (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(customUrl);
    }, backoffMs);
    this.reconnectTimer.unref();
  }

  stop(): void {
    this.isRunning = false;
    this.stopKeepAlive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status.isConnected = false;
  }

  getStatus(): TunnelStatus {
    return this.status;
  }
}

export const cloudTunnelClient = new CloudTunnelClient();
