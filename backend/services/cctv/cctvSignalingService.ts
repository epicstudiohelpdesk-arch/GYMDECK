/**
 * GymDeck Cloud CCTV Control Plane - WebRTC Signaling & Relay Service
 * Handles outbound persistent WebSocket connections from Edge Gateways and
 * relays SDP Offer/Answer and ICE candidates to/from remote viewers without port forwarding.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { verifyJwt } from '../../shared/security';
import { config } from '../../shared/config';
import { logger } from '../../shared/logging';

export interface SignalingMessage {
  type: 'GATEWAY_HELLO' | 'CLIENT_JOIN' | 'SDP_OFFER' | 'SDP_ANSWER' | 'ICE_CANDIDATE' | 'CLOSE_SESSION' | 'PING' | 'PONG' | 'ERROR';
  sessionId?: string;
  cameraId?: string;
  streamProfile?: 'MAIN' | 'SUB';
  sdp?: string;
  candidate?: any;
  token?: string;
  error?: string;
}

interface GatewaySocket {
  gatewayId: string;
  gymId: string;
  ws: WebSocket;
  lastPingAt: number;
}

interface ViewerSocket {
  sessionId: string;
  gymId: string;
  userId: string;
  cameraId: string;
  ws: WebSocket;
}

export class CctvSignalingService {
  private gatewaysByGym: Map<string, GatewaySocket> = new Map();
  private viewersBySession: Map<string, ViewerSocket> = new Map();
  private wss: WebSocketServer | null = null;

  init(wss: WebSocketServer): void {
    this.wss = wss;
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    logger.info('[CCTV Signaling] WebSocket signaling server initialized.');
  }

  /**
   * Dispatches incoming connection and authenticates token.
   */
  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    let boundGymId: string | null = null;
    let boundGatewayId: string | null = null;
    let boundSessionId: string | null = null;

    ws.on('message', async (raw: string) => {
      try {
        const msg: SignalingMessage = JSON.parse(raw.toString());

        switch (msg.type) {
          // 1. Edge Gateway Outbound Registration
          case 'GATEWAY_HELLO': {
            if (!msg.token) {
              this.sendError(ws, 'Missing gateway device token.');
              return;
            }

            try {
              const payload = verifyJwt<any>(msg.token, config.JWT_SECRET);
              if (!payload?.gymId || !payload?.sub) {
                this.sendError(ws, 'Invalid gateway token.');
                return;
              }
              const gymId: string = payload.gymId;
              const gatewayId: string = payload.sub;
              boundGymId = gymId;
              boundGatewayId = gatewayId;

              this.gatewaysByGym.set(gymId, {
                gatewayId,
                gymId,
                ws,
                lastPingAt: Date.now(),
              });

              ws.send(JSON.stringify({ type: 'GATEWAY_HELLO_ACK', gymId, gatewayId }));
              logger.info(`[CCTV Signaling] Gateway connected: ${gatewayId} for gym ${gymId}`);
            } catch {
              this.sendError(ws, 'Invalid or expired gateway device token.');
            }
            break;
          }

          // 2. Viewer Joining with Stream Ticket
          case 'CLIENT_JOIN': {
            if (!msg.token || !msg.sessionId || !msg.cameraId) {
              this.sendError(ws, 'Missing stream ticket, sessionId, or cameraId.');
              return;
            }

            try {
              const payload = verifyJwt<any>(msg.token, config.JWT_SECRET);
              if (!payload?.gymId) {
                this.sendError(ws, 'Invalid stream ticket: missing gymId');
                return;
              }
              const gymId: string = payload.gymId;
              const sessionId: string = msg.sessionId;
              boundGymId = gymId;
              boundSessionId = sessionId;

              // Check if gateway for this gym is online
              const gateway = this.gatewaysByGym.get(gymId);
              if (!gateway || gateway.ws.readyState !== WebSocket.OPEN) {
                this.sendError(ws, 'CCTV Edge Gateway is currently offline. Remote streaming unavailable.');
                return;
              }

              this.viewersBySession.set(sessionId, {
                sessionId,
                gymId,
                userId: payload.sub,
                cameraId: msg.cameraId,
                ws,
              });

              ws.send(JSON.stringify({ type: 'CLIENT_JOIN_ACK', sessionId }));
              logger.info(`[CCTV Signaling] Viewer joined session ${sessionId} for camera ${msg.cameraId}`);
            } catch {
              this.sendError(ws, 'Invalid or expired stream authorization ticket.');
            }
            break;
          }

          // 3. Relay SDP Offer from Viewer to Gateway
          case 'SDP_OFFER': {
            if (!boundSessionId || !boundGymId || !msg.sdp) {
              this.sendError(ws, 'Cannot send SDP Offer before authenticating session.');
              return;
            }

            const gateway = this.gatewaysByGym.get(boundGymId);
            if (!gateway || gateway.ws.readyState !== WebSocket.OPEN) {
              this.sendError(ws, 'Edge Gateway disconnected while establishing stream.');
              return;
            }

            gateway.ws.send(JSON.stringify({
              type: 'SDP_OFFER',
              sessionId: boundSessionId,
              cameraId: msg.cameraId,
              streamProfile: msg.streamProfile || 'SUB',
              sdp: msg.sdp,
            }));
            break;
          }

          // 4. Relay SDP Answer from Gateway to Viewer
          case 'SDP_ANSWER': {
            if (!boundGymId || !msg.sessionId || !msg.sdp) {
              this.sendError(ws, 'Missing sessionId or sdp in answer.');
              return;
            }

            const viewer = this.viewersBySession.get(msg.sessionId);
            if (viewer && viewer.gymId === boundGymId && viewer.ws.readyState === WebSocket.OPEN) {
              viewer.ws.send(JSON.stringify({
                type: 'SDP_ANSWER',
                sessionId: msg.sessionId,
                sdp: msg.sdp,
              }));
            }
            break;
          }

          // 5. Bidirectional ICE Candidate Exchange
          case 'ICE_CANDIDATE': {
            if (!msg.sessionId || !boundGymId) return;

            // If message came from gateway, forward to viewer
            if (boundGatewayId) {
              const viewer = this.viewersBySession.get(msg.sessionId);
              if (viewer && viewer.gymId === boundGymId && viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({
                  type: 'ICE_CANDIDATE',
                  sessionId: msg.sessionId,
                  candidate: msg.candidate,
                }));
              }
            } else {
              // Message came from viewer, forward to gateway
              const gateway = this.gatewaysByGym.get(boundGymId);
              if (gateway && gateway.ws.readyState === WebSocket.OPEN) {
                gateway.ws.send(JSON.stringify({
                  type: 'ICE_CANDIDATE',
                  sessionId: msg.sessionId,
                  candidate: msg.candidate,
                }));
              }
            }
            break;
          }

          case 'PING': {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;
          }

          case 'CLOSE_SESSION': {
            if (msg.sessionId) {
              this.viewersBySession.delete(msg.sessionId);
            }
            break;
          }
        }
      } catch (err) {
        this.sendError(ws, 'Malformed signaling payload.');
      }
    });

    ws.on('close', () => {
      if (boundGatewayId && boundGymId) {
        this.gatewaysByGym.delete(boundGymId);
        logger.info(`[CCTV Signaling] Gateway ${boundGatewayId} disconnected.`);
      }
      if (boundSessionId) {
        this.viewersBySession.delete(boundSessionId);
        logger.info(`[CCTV Signaling] Viewer session ${boundSessionId} closed.`);
      }
    });
  }

  private sendError(ws: WebSocket, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ERROR', error: message }));
    }
  }

  isGatewayOnline(gymId: string): boolean {
    const gw = this.gatewaysByGym.get(gymId);
    return Boolean(gw && gw.ws.readyState === WebSocket.OPEN);
  }

  getConnectedGatewaysCount(): number {
    return this.gatewaysByGym.size;
  }
}

export const cctvSignalingService = new CctvSignalingService();
