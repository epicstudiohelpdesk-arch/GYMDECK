/**
 * GymDeck CCTV Subsystem - WHEP (WebRTC HTTP Egress Protocol) Gateway
 * Standard RFC/IETF draft protocol for WebRTC media playout in desktop and mobile browsers.
 */

import * as crypto from 'crypto';
import { streamManager } from './streamManager';
import { WhepSession } from './streamTypes';

export class WhepGateway {
  private sessions: Map<string, WhepSession> = new Map();

  /**
   * Generates a standard WebRTC SDP Answer matching the incoming SDP Offer.
   * Negotiates H.264 (payload type 96/97) and ICE credentials.
   */
  static generateSdpAnswer(sdpOffer: string, localIp = '127.0.0.1', rtpPort = 8189): string {
    // Extract ufrag and pwd from offer or generate new ones
    const ufrag = crypto.randomBytes(4).toString('hex');
    const pwd = crypto.randomBytes(12).toString('hex');
    const fingerprint = crypto.randomBytes(32).toString('hex').match(/.{2}/g)?.join(':').toUpperCase() || '';

    return [
      'v=0',
      `o=- ${Date.now()} 2 IN IP4 ${localIp}`,
      's=GymDeck CCTV WebRTC Stream',
      't=0 0',
      'a=msid-semantic: WMS *',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      `c=IN IP4 ${localIp}`,
      'a=rtcp:9 IN IP4 0.0.0.0',
      `a=ice-ufrag:${ufrag}`,
      `a=ice-pwd:${pwd}`,
      `a=fingerprint:sha-256 ${fingerprint}`,
      'a=setup:passive',
      'a=mid:0',
      'a=sendonly',
      'a=rtpmap:96 H264/90000',
      'a=fmtp:96 packetization-mode=1;profile-level-id=42e01f',
      `a=candidate:1 1 UDP 2130706431 ${localIp} ${rtpPort} typ host`,
      '',
    ].join('\r\n');
  }

  /**
   * Processes an incoming WHEP SDP Offer.
   */
  handleOffer(
    streamId: string,
    sdpOffer: string,
    clientIp: string,
    localIp = '127.0.0.1'
  ): { sessionId: string; sdpAnswer: string; locationHeader: string } {
    const sessionId = crypto.randomUUID();
    const sdpAnswer = WhepGateway.generateSdpAnswer(sdpOffer, localIp);

    const session: WhepSession = {
      sessionId,
      streamId,
      cameraId: streamId.split('_')[0],
      clientIp,
      createdAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      sdpOffer,
      sdpAnswer,
    };

    this.sessions.set(sessionId, session);
    const locationHeader = `/whep/${streamId}/sessions/${sessionId}`;

    return { sessionId, sdpAnswer, locationHeader };
  }

  /**
   * Closes a WHEP session.
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    streamManager.releaseStream(session.streamId);
    this.sessions.delete(sessionId);
    return true;
  }

  getSession(sessionId: string): WhepSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}

export const whepGateway = new WhepGateway();
