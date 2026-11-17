/**
 * GymDeck CCTV Subsystem - Phase 0 & Phase 1 Verification Test Suite
 * Tests MediaMTX supervision, IPC security, credential sanitization,
 * WHEP WebRTC playout, and contract alignments.
 */

import * as http from 'http';
import { mediaMtxManager } from '../src/media/mediaMtxManager';
import { MediaEngine } from '../src/media/mediaEngine';
import { sanitizeRtspUrl, sanitizeLog } from '../src/security/sanitizer';
import { secureStore } from '../src/config/secureStore';
import { LocalApiServer } from '../src/server/localApi';
import { whepGateway } from '../src/media/whepGateway';
import { streamManager } from '../src/media/streamManager';

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

async function runPhase0Phase1Tests() {
  console.log('\n============================================================');
  console.log('🧪 GYMDECK CCTV PHASE 0 & PHASE 1 VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // Test 1: Credential Sanitization & Security (Phase 0)
  // -------------------------------------------------------------
  console.log('1. Credential Sanitization & Privacy Guards (Phase 0)');
  const dirtyRtsp = 'rtsp://admin:SecretPass123!@192.168.1.120:554/Streaming/Channels/101';
  const maskedRtsp = sanitizeRtspUrl(dirtyRtsp, true);
  assert(maskedRtsp === 'rtsp://***:***@192.168.1.120:554/Streaming/Channels/101', 'RTSP password masked with ***:***');
  assert(!maskedRtsp.includes('SecretPass123!'), 'Plaintext password stripped from URL');

  const strippedRtsp = sanitizeRtspUrl(dirtyRtsp, false);
  assert(strippedRtsp === 'rtsp://192.168.1.120:554/Streaming/Channels/101', 'RTSP credentials completely removed for public view');

  const dirtyLog = JSON.stringify({
    password: 'SuperSecretNvrPassword',
    deviceToken: 'jwt.token.here',
    sourceUrl: dirtyRtsp,
  });
  const safeLog = sanitizeLog(dirtyLog);
  assert(!safeLog.includes('SuperSecretNvrPassword'), 'Password redacted from log output');
  assert(!safeLog.includes('SecretPass123!'), 'RTSP password redacted from log output');
  assert(safeLog.includes('[REDACTED]'), 'Redaction placeholder injected into logs');

  // -------------------------------------------------------------
  // Test 2: Localhost IPC Shared Secret & Security Store (Phase 0)
  // -------------------------------------------------------------
  console.log('\n2. Localhost IPC Shared Secret & Authorization (Phase 0)');
  let token = secureStore.getOrGenerateIpcSecret();
  assert(typeof token === 'string' && token.length === 64, 'Generated 32-byte (64 hex char) cryptographic IPC token');
  assert(secureStore.verifyIpcSecret(token) === true, 'Valid IPC token verified with timing-safe comparison');
  assert(secureStore.verifyIpcSecret('invalid_token_12345678901234567890') === false, 'Invalid token rejected');
  assert(secureStore.verifyIpcSecret('') === false, 'Empty token rejected');
  assert(secureStore.verifyIpcSecret(null) === false, 'Null token rejected');

  // -------------------------------------------------------------
  // Test 3: Local Loopback API Security & IPC Authentication (Phase 0)
  // -------------------------------------------------------------
  console.log('\n3. Local API Security & Origin/Host Validation (Phase 0)');
  const testPort = 49160;
  const testApi = new LocalApiServer();
  await testApi.start(testPort);

  // Health is unauthenticated
  const healthRes = await fetch(`http://127.0.0.1:${testPort}/health`);
  assert(healthRes.status === 200, 'GET /health responds without auth for readiness probes');

  // Unauthenticated token retrieval over HTTP is strictly blocked (prevent rogue process extraction)
  const tokenRes = await fetch(`http://127.0.0.1:${testPort}/ipc/token`);
  assert(tokenRes.status === 403, 'GET /ipc/token rejected with HTTP 403 (unauthenticated HTTP extraction disabled)');
  const tokenData = await tokenRes.json() as any;
  assert(tokenData.error.includes('disabled'), 'Explicit error explains direct HTTP extraction is disabled');

  // Authenticated token rotation endpoint
  const rotateRes = await fetch(`http://127.0.0.1:${testPort}/ipc/token/rotate`, {
    method: 'POST',
    headers: { 'X-GymDeck-IPC-Token': token },
  });
  assert(rotateRes.status === 200, 'POST /ipc/token/rotate succeeds with current valid token');
  const rotateData = await rotateRes.json() as any;
  assert(rotateData.token && rotateData.token.length === 64, 'Rotated token is 64 hex characters');
  // Update local reference to the rotated token for subsequent tests
  token = rotateData.token;

  // Bad Host header rejected (using raw http.request because native fetch ignores forbidden Host header)
  const badHostStatus = await new Promise<number>((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: testPort,
        path: '/health',
        method: 'GET',
        headers: { Host: 'evil-external-site.com' },
      },
      (res) => resolve(res.statusCode || 0)
    );
    req.on('error', () => resolve(0));
    req.end();
  });
  assert(badHostStatus === 400, 'Requests with non-loopback Host header rejected with HTTP 400');

  // Bad Origin rejected
  const badOriginRes = await fetch(`http://127.0.0.1:${testPort}/health`, {
    headers: { Origin: 'http://malicious-website.com' },
  });
  assert(badOriginRes.status === 403, 'Requests with untrusted Origin header rejected with HTTP 403');

  // Invalid IPC token on protected route rejected
  const badTokenRes = await fetch(`http://127.0.0.1:${testPort}/streams/active`, {
    headers: { 'X-GymDeck-IPC-Token': 'wrong_fake_token_123' },
  });
  assert(badTokenRes.status === 401, 'Protected route with invalid IPC token rejected with HTTP 401');

  // Valid IPC token on protected route succeeds
  const validStatusRes = await fetch(`http://127.0.0.1:${testPort}/streams/active`, {
    headers: { 'X-GymDeck-IPC-Token': token },
  });
  assert(validStatusRes.status === 200, 'Protected route with valid IPC token succeeds with HTTP 200');

  // -------------------------------------------------------------
  // Test 4: MediaMTX Binary Discovery & Supervisor Lifecycle (Phase 1A)
  // -------------------------------------------------------------
  console.log('\n4. MediaMTX Binary Discovery & Supervisor Lifecycle (Phase 1A)');
  const binPath = mediaMtxManager.resolveBinary();
  assert(binPath !== null, `Official MediaMTX binary resolved: ${binPath}`);

  // Test dynamic configuration generation
  const testRoutes = [
    {
      streamId: 'cam_reception_sub',
      cameraId: 'cam_1',
      channelNumber: 1,
      profile: 'SUB' as const,
      rtspUrl: 'rtsp://192.168.1.50:554/cam/realmonitor?channel=1&subtype=1',
    },
    {
      streamId: 'cam_reception_main',
      cameraId: 'cam_1',
      channelNumber: 1,
      profile: 'MAIN' as const,
      rtspUrl: 'rtsp://192.168.1.50:554/cam/realmonitor?channel=1&subtype=0',
    },
  ];

  const yamlConfig = MediaEngine.generateConfig(testRoutes, 8899, 8564, '127.0.0.1');
  assert(yamlConfig.includes('cam_reception_sub:'), 'Config contains substream path');
  assert(yamlConfig.includes('cam_reception_main:'), 'Config contains main stream path');
  assert(yamlConfig.includes('sourceOnDemand: yes'), 'Configures on-demand ingestion');
  assert(!yamlConfig.includes('webrtcAllowCrossOrigin'), 'Omits legacy deprecated fields');

  // Start MediaMTX process
  const mtxStarted = await mediaMtxManager.start();
  assert(mtxStarted === true, 'MediaMTX supervisor successfully started child process');
  const mtxStatus = mediaMtxManager.getStatus();
  assert(mtxStatus.isRunning === true, `MediaMTX is running (PID: ${mtxStatus.pid})`);

  // Verify MediaMTX WHEP port is open and responding
  const mtxProbe = await fetch(`http://127.0.0.1:${mediaMtxManager.getWhepPort()}/`, {
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  assert(mtxProbe !== null, `MediaMTX WHEP HTTP port :${mediaMtxManager.getWhepPort()} is open and reachable`);

  // -------------------------------------------------------------
  // Test 5: Real WHEP Negotiation & Session Management (Phase 1C)
  // -------------------------------------------------------------
  console.log('\n5. Real WHEP Negotiation & Session Management (Phase 1C)');
  const dummyOffer = [
    'v=0',
    'o=- 123456789 2 IN IP4 127.0.0.1',
    's=Test Client Offer',
    't=0 0',
    'm=video 9 UDP/TLS/RTP/SAVPF 96',
    'c=IN IP4 127.0.0.1',
    'a=rtpmap:96 H264/90000',
    'a=recvonly',
    '',
  ].join('\r\n');

  // Request stream activation
  const reqStreamRes = await fetch(`http://127.0.0.1:${testPort}/streams/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GymDeck-IPC-Token': token,
    },
    body: JSON.stringify({
      cameraId: 'cam_test',
      channelNumber: 1,
      profile: 'SUB',
      rtspUrl: 'rtsp://admin:pass123@127.0.0.1:8554/cam_test',
    }),
  });
  assert(reqStreamRes.status === 200, 'POST /streams/request succeeded');
  const streamData = await reqStreamRes.json() as any;
  assert(streamData.stream.rtspSourceUrl.includes('***:***'), 'RTSP credentials masked in /streams/request response');
  assert(!streamData.stream.rtspSourceUrl.includes('pass123'), 'Plaintext password never returned to client');

  // Send WHEP offer through localApi
  const whepRes = await fetch(`http://127.0.0.1:${testPort}/whep/cam_test_sub`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      'X-GymDeck-IPC-Token': token,
    },
    body: dummyOffer,
  });
  assert(whepRes.status === 201, 'POST /whep responded with HTTP 201 Created');
  assert(whepRes.headers.get('content-type') === 'application/sdp', 'Response content-type is application/sdp');
  const locHeader = whepRes.headers.get('location');
  assert(Boolean(locHeader && locHeader.includes('/sessions/')), 'Valid WHEP Location header returned');

  const sdpAnswer = await whepRes.text();
  assert(sdpAnswer.includes('v=0'), 'SDP answer contains v=0 protocol version');
  assert(sdpAnswer.includes('H264/90000'), 'SDP answer negotiates H.264 video codec');

  // Teardown WHEP session
  const deleteRes = await fetch(`http://127.0.0.1:${testPort}${locHeader}`, {
    method: 'DELETE',
    headers: { 'X-GymDeck-IPC-Token': token },
  });
  assert(deleteRes.status === 200, 'DELETE on WHEP session cleanly terminates WebRTC stream');

  // Clean shutdown of test API and MediaMTX
  await testApi.stop();
  await mediaMtxManager.stop();
  assert(mediaMtxManager.getStatus().isRunning === false, 'MediaMTX supervisor cleanly stopped');

  console.log('\n============================================================');
  console.log(`🎉 ALL PHASE 0 & PHASE 1 TESTS PASSED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('============================================================\n');
}

runPhase0Phase1Tests().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Exception:', err);
  process.exit(1);
});
