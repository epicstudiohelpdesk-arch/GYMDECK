/**
 * GymDeck CCTV Edge Gateway - Remote WebRTC NAT Traversal & Candidate Classifier
 * Classifies ICE candidates into host, server-reflexive, and relayed,
 * managing fallback to TURN relay when direct P2P hole-punching is blocked.
 */

export type IceCandidateType = 'host' | 'srflx' | 'prflx' | 'relay';
export type WebRtcConnectionType = 'LOCAL_LAN' | 'DIRECT_P2P' | 'TURN_RELAY';

export interface ClassifiedCandidate {
  type: IceCandidateType;
  foundation: string;
  component: number;
  protocol: 'udp' | 'tcp';
  priority: number;
  ip: string;
  port: number;
  raw: string;
}

export class RemoteWebRtcEngine {
  /**
   * Parses standard SDP candidate line and classifies candidate type per RFC 5245.
   */
  static parseCandidate(candidateLine: string): ClassifiedCandidate | null {
    // Example: candidate:1 1 UDP 2130706431 192.168.1.109 8189 typ host
    // Example: candidate:2 1 UDP 1694498815 203.0.113.5 54321 typ srflx raddr 192.168.1.109 rport 8189
    // Example: candidate:3 1 UDP 16777215 198.51.100.10 49152 typ relay raddr 203.0.113.5 rport 54321
    const match = candidateLine.match(/candidate:(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+typ\s+(\S+)/i);
    if (!match) return null;

    const protocol = match[3].toLowerCase() as 'udp' | 'tcp';
    const rawType = match[7].toLowerCase();
    const type: IceCandidateType =
      rawType === 'host' ? 'host' :
      rawType === 'srflx' ? 'srflx' :
      rawType === 'relay' ? 'relay' : 'prflx';

    return {
      foundation: match[1],
      component: parseInt(match[2], 10),
      protocol,
      priority: parseInt(match[4], 10),
      ip: match[5],
      port: parseInt(match[6], 10),
      type,
      raw: candidateLine,
    };
  }

  /**
   * Determines effective connection type based on selected local and remote candidate pair.
   */
  static determineConnectionType(localCandidate: ClassifiedCandidate, remoteCandidate: ClassifiedCandidate): WebRtcConnectionType {
    // If either candidate is a relay candidate, media transits the TURN server
    if (localCandidate.type === 'relay' || remoteCandidate.type === 'relay') {
      return 'TURN_RELAY';
    }

    // If both candidates have private/local IP addresses on the same subnet, it's local LAN
    if (localCandidate.type === 'host' && remoteCandidate.type === 'host') {
      const isLocal =
        localCandidate.ip.startsWith('192.168.') ||
        localCandidate.ip.startsWith('10.') ||
        localCandidate.ip.startsWith('172.16.') ||
        localCandidate.ip === '127.0.0.1';
      if (isLocal) {
        return 'LOCAL_LAN';
      }
    }

    // Otherwise, direct P2P hole-punching via STUN succeeded
    return 'DIRECT_P2P';
  }

  /**
   * Evaluates simulated NAT traversal behavior:
   * When symmetric NAT blocks P2P, verifies that a relay candidate is present to prevent connection failure.
   */
  static selectBestCandidatePair(
    localCandidates: ClassifiedCandidate[],
    remoteCandidates: ClassifiedCandidate[],
    isSymmetricNatSimulated = false
  ): { local: ClassifiedCandidate; remote: ClassifiedCandidate; connectionType: WebRtcConnectionType } | null {
    if (localCandidates.length === 0 || remoteCandidates.length === 0) return null;

    if (!isSymmetricNatSimulated) {
      // Normal path: prefer direct host (if on LAN) or srflx (P2P)
      const hostPair = localCandidates.find(l => l.type === 'host') && remoteCandidates.find(r => r.type === 'host');
      if (hostPair) {
        const l = localCandidates.find(l => l.type === 'host')!;
        const r = remoteCandidates.find(r => r.type === 'host')!;
        return { local: l, remote: r, connectionType: RemoteWebRtcEngine.determineConnectionType(l, r) };
      }

      const srflxPair = localCandidates.find(l => l.type === 'srflx') && remoteCandidates.find(r => r.type === 'srflx');
      if (srflxPair) {
        const l = localCandidates.find(l => l.type === 'srflx')!;
        const r = remoteCandidates.find(r => r.type === 'srflx')!;
        return { local: l, remote: r, connectionType: 'DIRECT_P2P' };
      }
    }

    // Symmetric NAT / Restricted path: Fall back to TURN relay
    const relayPair = localCandidates.find(l => l.type === 'relay') || remoteCandidates.find(r => r.type === 'relay');
    if (relayPair) {
      const l = localCandidates.find(l => l.type === 'relay') || localCandidates[0];
      const r = remoteCandidates.find(r => r.type === 'relay') || remoteCandidates[0];
      return { local: l, remote: r, connectionType: 'TURN_RELAY' };
    }

    // If symmetric NAT is present and no TURN relay is available, connection drops!
    return null;
  }
}
