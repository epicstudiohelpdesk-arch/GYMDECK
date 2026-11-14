/**
 * GymDeck CCTV Subsystem - Gate 6 Verification Test Suite
 * Tests RFC 5766 Ephemeral TURN Credentials, ICE Server Generation,
 * and Honest Remote Diagnostics Evaluation.
 */

import * as crypto from 'crypto';
import { cctvTurnService } from '../services/cctv/cctvTurnService';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ PASSED: ${message}`);
    testsPassed++;
  }
}

async function runGate6Tests() {
  console.log('\n============================================================');
  console.log('🧪 GYMDECK CCTV GATE 6: REMOTE WEBRTC & TURN CLOUD SERVICE');
  console.log('============================================================\n');

  // Test 1: RFC 5766 Ephemeral TURN Credential Generation
  console.log('1. RFC 5766 Ephemeral TURN Credentials (HMAC-SHA1)');
  const userId = crypto.randomUUID();
  const credentials = cctvTurnService.generateEphemeralTurnCredentials(userId, 3600);

  assert(credentials.username.includes(':'), 'Username formatted as <expiryTimestamp>:<userId>');
  const parts = credentials.username.split(':');
  assert(parts[1] === userId, 'Username contains target user identifier');
  assert(Number(parts[0]) > Math.floor(Date.now() / 1000), 'Timestamp set in the future');
  assert(Boolean(credentials.credential && credentials.credential.length > 20), 'Generated base64 HMAC-SHA1 credential');

  // Test 2: Multi-Protocol ICE Servers Configuration
  console.log('\n2. Multi-Protocol ICE Servers (STUN, UDP TURN, TCP TURN, TLS Port 443)');
  const iceServers = cctvTurnService.getIceServers(userId);

  assert(iceServers.length >= 4, 'Provides full suite of ICE candidates for maximum traversal');

  const stunServer = iceServers.find((s) => Array.isArray(s.urls) && s.urls.some((u) => u.startsWith('stun:')));
  assert(Boolean(stunServer), 'STUN server configured for direct P2P hole-punching');

  const udpTurn = iceServers.find((s) => typeof s.urls === 'string' && s.urls.includes('transport=udp'));
  assert(Boolean(udpTurn && udpTurn.username), 'UDP TURN server configured with ephemeral credentials');

  const tcpTurn = iceServers.find((s) => typeof s.urls === 'string' && s.urls.includes('transport=tcp') && s.urls.startsWith('turn:'));
  assert(Boolean(tcpTurn && tcpTurn.username), 'TCP TURN server configured for networks blocking UDP');

  const tlsTurn = iceServers.find((s) => typeof s.urls === 'string' && s.urls.startsWith('turns:') && s.urls.includes(':443'));
  assert(Boolean(tlsTurn && tlsTurn.username), 'TLS TURNS over HTTPS port 443 configured for restrictive firewalls');

  // Test 3: Honest Remote Access Status Evaluation
  console.log('\n3. Honest Remote Access Status Evaluation (Screen 7)');
  const offlineDiag = cctvTurnService.evaluateRemoteAccessStatus({
    isGatewayOnline: false,
    hasStunResolution: false,
    hasTurnConfigured: false,
    testedFromRemote: false,
  });
  assert(offlineDiag.overallStatus === 'REMOTE_VIEWING_UNAVAILABLE', 'Reports REMOTE_VIEWING_UNAVAILABLE when gateway is offline');

  const lanOnlyDiag = cctvTurnService.evaluateRemoteAccessStatus({
    isGatewayOnline: true,
    hasStunResolution: true,
    hasTurnConfigured: true,
    testedFromRemote: false,
  });
  assert(lanOnlyDiag.localViewingReady === true, 'Local viewing confirmed ready on LAN');
  assert(lanOnlyDiag.overallStatus === 'REMOTE_VIEWING_NOT_TESTED', 'Honest status: REMOTE_VIEWING_NOT_TESTED (never fakes remote ready from LAN)');

  const verifiedDiag = cctvTurnService.evaluateRemoteAccessStatus({
    isGatewayOnline: true,
    hasStunResolution: true,
    hasTurnConfigured: true,
    testedFromRemote: true,
  });
  assert(verifiedDiag.overallStatus === 'REMOTE_VIEWING_READY', 'Reports REMOTE_VIEWING_READY once verified from external network');

  console.log('\n============================================================');
  console.log(`🎉 ALL GATE 6 TESTS COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runGate6Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
