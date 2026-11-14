/**
 * GymDeck CCTV Edge Gateway - Gate 6 Verification Test Suite
 * Tests ICE candidate parsing, symmetric NAT detection, and TURN relay candidate pair selection.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { RemoteWebRtcEngine, ClassifiedCandidate } from '../src/media/remoteWebRtcEngine';

describe('CCTV Gate 6 - Edge Gateway Remote WebRTC & TURN Engine', () => {
  const hostLine = 'candidate:1 1 UDP 2130706431 192.168.1.109 8189 typ host';
  const srflxLine = 'candidate:2 1 UDP 1694498815 203.0.113.5 54321 typ srflx raddr 192.168.1.109 rport 8189';
  const relayLine = 'candidate:3 1 UDP 16777215 198.51.100.10 49152 typ relay raddr 203.0.113.5 rport 54321';

  it('1. should accurately parse and classify RFC 5245 ICE candidates', () => {
    const hostCand = RemoteWebRtcEngine.parseCandidate(hostLine);
    assert.strictEqual(hostCand?.type, 'host');
    assert.strictEqual(hostCand?.ip, '192.168.1.109');

    const srflxCand = RemoteWebRtcEngine.parseCandidate(srflxLine);
    assert.strictEqual(srflxCand?.type, 'srflx');
    assert.strictEqual(srflxCand?.ip, '203.0.113.5');

    const relayCand = RemoteWebRtcEngine.parseCandidate(relayLine);
    assert.strictEqual(relayCand?.type, 'relay');
    assert.strictEqual(relayCand?.ip, '198.51.100.10');
  });

  it('2. should select DIRECT_P2P candidate pair when direct hole punching succeeds', () => {
    const hostCand = RemoteWebRtcEngine.parseCandidate(hostLine)!;
    const srflxCand = RemoteWebRtcEngine.parseCandidate(srflxLine)!;
    const relayCand = RemoteWebRtcEngine.parseCandidate(relayLine)!;

    const localCandidates: ClassifiedCandidate[] = [hostCand, srflxCand, relayCand];
    const remoteCandidates: ClassifiedCandidate[] = [
      RemoteWebRtcEngine.parseCandidate('candidate:10 1 UDP 1694498815 198.51.100.50 60000 typ srflx')!,
    ];

    const pair = RemoteWebRtcEngine.selectBestCandidatePair(localCandidates, remoteCandidates, false);
    assert.ok(pair !== null);
    assert.strictEqual(pair?.connectionType, 'DIRECT_P2P');
  });

  it('3. should fall back to TURN_RELAY under restrictive symmetric NAT', () => {
    const hostCand = RemoteWebRtcEngine.parseCandidate(hostLine)!;
    const srflxCand = RemoteWebRtcEngine.parseCandidate(srflxLine)!;
    const relayCand = RemoteWebRtcEngine.parseCandidate(relayLine)!;

    const localCandidates: ClassifiedCandidate[] = [hostCand, srflxCand, relayCand];
    const remoteCandidates: ClassifiedCandidate[] = [
      RemoteWebRtcEngine.parseCandidate('candidate:11 1 UDP 16777215 198.51.100.20 50000 typ relay')!,
    ];

    const pair = RemoteWebRtcEngine.selectBestCandidatePair(localCandidates, remoteCandidates, true);
    assert.ok(pair !== null);
    assert.strictEqual(pair?.connectionType, 'TURN_RELAY');
  });

  it('4. should return null if symmetric NAT blocks direct P2P and no TURN candidates are available', () => {
    const hostCand = RemoteWebRtcEngine.parseCandidate(hostLine)!;
    const srflxCand = RemoteWebRtcEngine.parseCandidate(srflxLine)!;

    const localCandidates: ClassifiedCandidate[] = [hostCand, srflxCand];
    const remoteCandidates: ClassifiedCandidate[] = [
      RemoteWebRtcEngine.parseCandidate('candidate:12 1 UDP 1694498815 203.0.113.88 44444 typ srflx')!,
    ];

    const pair = RemoteWebRtcEngine.selectBestCandidatePair(localCandidates, remoteCandidates, true);
    assert.strictEqual(pair, null);
  });
});
