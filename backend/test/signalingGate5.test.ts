/**
 * GymDeck CCTV Subsystem - Gate 5 Verification Test Suite
 * Tests Cloud WebRTC Signaling Server, outbound gateway tunnel handshake,
 * bidirectional SDP Offer/Answer relay, ICE candidate exchange, and multi-tenant isolation.
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { cctvSignalingService } from '../services/cctv/cctvSignalingService';
import { signJwt } from '../shared/security';
import { config } from '../shared/config';

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

async function runGate5Tests() {
  console.log('\n============================================================');
  console.log('🧪 GYMDECK CCTV GATE 5: CLOUD SIGNALING & TUNNEL HANDSHAKE');
  console.log('============================================================\n');

  // Setup standalone HTTP + WebSocket server for testing
  const server = http.createServer();
  const wss = new WebSocketServer({ noServer: true });
  cctvSignalingService.init(wss);

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  const testPort = 49160;
  await new Promise<void>((resolve) => server.listen(testPort, '127.0.0.1', () => resolve()));
  const wsUrl = `ws://127.0.0.1:${testPort}`;

  const gymA = crypto.randomUUID();
  const gymB = crypto.randomUUID();
  const gatewayAId = crypto.randomUUID();
  const cameraId = crypto.randomUUID();

  // Test 1: Gateway Authentication Rejection on Invalid Token
  console.log('1. Gateway Attestation & Rejection of Bad Credentials');
  const badGwWs = new WebSocket(wsUrl);
  await new Promise<void>((resolve) => badGwWs.on('open', () => resolve()));

  const badTokenPromise = new Promise<string>((resolve) => {
    badGwWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ERROR') resolve(msg.error);
    });
  });

  badGwWs.send(JSON.stringify({ type: 'GATEWAY_HELLO', token: 'invalid_malicious_token' }));
  const errMsg = await badTokenPromise;
  assert(errMsg.includes('Invalid or expired gateway device token'), 'Signaling server rejected fake gateway token');
  badGwWs.close();

  // Test 2: Valid Gateway Registration (Outbound Tunnel)
  console.log('\n2. Valid Gateway Attestation & Persistent Tunnel');
  const validDeviceTokenA = signJwt(
    {
      sub: gatewayAId,
      gymId: gymA,
      email: `gateway-${gatewayAId}@gymdeck.edge`,
      role: 'DESKTOP_SYNC',
      jti: crypto.randomUUID(),
    },
    config.JWT_SECRET,
    86400
  );

  const gwWs = new WebSocket(wsUrl);
  await new Promise<void>((resolve) => gwWs.on('open', () => resolve()));

  const gwAckPromise = new Promise<any>((resolve) => {
    gwWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'GATEWAY_HELLO_ACK') resolve(msg);
    });
  });

  gwWs.send(JSON.stringify({ type: 'GATEWAY_HELLO', token: validDeviceTokenA }));
  const gwAck = await gwAckPromise;

  assert(gwAck.gymId === gymA, 'Gateway successfully registered for Gym A');
  assert(gwAck.gatewayId === gatewayAId, 'Gateway ID confirmed in Hello ACK');
  assert(cctvSignalingService.isGatewayOnline(gymA), 'Signaling registry reports Gateway A is ONLINE');

  // Test 3: Viewer Authentication & Joining
  console.log('\n3. Remote Viewer Authentication via Short-Lived Ticket');
  const sessionId = crypto.randomUUID();
  const viewerUserId = crypto.randomUUID();

  const viewerTicketA = signJwt(
    {
      sub: viewerUserId,
      sessionId,
      gymId: gymA,
      email: 'owner@gyma.com',
      role: 'OWNER',
      permissions: ['cctv.stream.view'],
      jti: crypto.randomUUID(),
    },
    config.JWT_SECRET,
    60
  );

  const viewerWs = new WebSocket(wsUrl);
  await new Promise<void>((resolve) => viewerWs.on('open', () => resolve()));

  const viewerJoinPromise = new Promise<any>((resolve) => {
    viewerWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'CLIENT_JOIN_ACK') resolve(msg);
    });
  });

  viewerWs.send(JSON.stringify({
    type: 'CLIENT_JOIN',
    token: viewerTicketA,
    sessionId,
    cameraId,
  }));

  const viewerAck = await viewerJoinPromise;
  assert(viewerAck.sessionId === sessionId, 'Viewer successfully joined session with valid stream ticket');

  // Test 4: End-to-End SDP Offer / Answer Relay
  console.log('\n4. End-to-End SDP Offer / Answer Relay (Zero Port Forwarding)');
  const mockSdpOffer = 'v=0\r\no=- 1234 2 IN IP4 0.0.0.0\r\ns=GymDeck Viewer Offer\r\n';
  const mockSdpAnswer = 'v=0\r\no=- 5678 2 IN IP4 192.168.1.109\r\ns=Gateway Answer\r\n';

  // 4a. Gateway waits for incoming SDP_OFFER
  const gatewayOfferPromise = new Promise<any>((resolve) => {
    gwWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'SDP_OFFER') resolve(msg);
    });
  });

  // Viewer sends SDP_OFFER
  viewerWs.send(JSON.stringify({
    type: 'SDP_OFFER',
    sessionId,
    cameraId,
    streamProfile: 'SUB',
    sdp: mockSdpOffer,
  }));

  const receivedOffer = await gatewayOfferPromise;
  assert(receivedOffer.sessionId === sessionId, 'Gateway received SDP Offer with correct sessionId');
  assert(receivedOffer.cameraId === cameraId, 'Gateway received SDP Offer with correct cameraId');
  assert(receivedOffer.sdp === mockSdpOffer, 'SDP Offer content relayed intact to local gateway');

  // 4b. Viewer waits for incoming SDP_ANSWER
  const viewerAnswerPromise = new Promise<any>((resolve) => {
    viewerWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'SDP_ANSWER') resolve(msg);
    });
  });

  // Gateway responds with SDP_ANSWER
  gwWs.send(JSON.stringify({
    type: 'SDP_ANSWER',
    sessionId,
    sdp: mockSdpAnswer,
  }));

  const receivedAnswer = await viewerAnswerPromise;
  assert(receivedAnswer.sessionId === sessionId, 'Viewer received SDP Answer with matching sessionId');
  assert(receivedAnswer.sdp === mockSdpAnswer, 'SDP Answer content relayed intact to remote viewer');

  // Test 5: Bidirectional ICE Candidate Exchange
  console.log('\n5. Bidirectional ICE Candidate Relay');
  const mockIceCandidateFromViewer = { candidate: 'candidate:1 1 UDP 2130706431 1.2.3.4 5000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
  const mockIceCandidateFromGateway = { candidate: 'candidate:2 1 UDP 2130706431 192.168.1.109 8189 typ host', sdpMid: '0', sdpMLineIndex: 0 };

  const gatewayCandidatePromise = new Promise<any>((resolve) => {
    gwWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ICE_CANDIDATE') resolve(msg);
    });
  });

  viewerWs.send(JSON.stringify({
    type: 'ICE_CANDIDATE',
    sessionId,
    candidate: mockIceCandidateFromViewer,
  }));

  const receivedGwCand = await gatewayCandidatePromise;
  assert(receivedGwCand.candidate.candidate === mockIceCandidateFromViewer.candidate, 'ICE candidate forwarded from viewer to gateway');

  const viewerCandidatePromise = new Promise<any>((resolve) => {
    viewerWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ICE_CANDIDATE') resolve(msg);
    });
  });

  gwWs.send(JSON.stringify({
    type: 'ICE_CANDIDATE',
    sessionId,
    candidate: mockIceCandidateFromGateway,
  }));

  const receivedViewerCand = await viewerCandidatePromise;
  assert(receivedViewerCand.candidate.candidate === mockIceCandidateFromGateway.candidate, 'ICE candidate forwarded from gateway to viewer');

  // Test 6: Multi-Tenant Isolation Barrier
  console.log('\n6. Multi-Tenant Signaling Isolation Barrier');
  const attackerTicketGymB = signJwt(
    {
      sub: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      gymId: gymB, // Tenant B!
      email: 'attacker@gymB.com',
      role: 'OWNER',
      permissions: ['cctv.stream.view'],
      jti: crypto.randomUUID(),
    },
    config.JWT_SECRET,
    60
  );

  const attackerWs = new WebSocket(wsUrl);
  await new Promise<void>((resolve) => attackerWs.on('open', () => resolve()));

  const attackerPromise = new Promise<string>((resolve) => {
    attackerWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ERROR') resolve(msg.error);
    });
  });

  // Attacker from Gym B tries to join stream for Gym A's camera
  attackerWs.send(JSON.stringify({
    type: 'CLIENT_JOIN',
    token: attackerTicketGymB,
    sessionId: crypto.randomUUID(),
    cameraId,
  }));

  const crossTenantErr = await attackerPromise;
  assert(crossTenantErr.includes('Edge Gateway is currently offline'), 'Tenant B blocked from accessing Tenant A gateway');
  attackerWs.close();

  // Test 7: Gateway Disconnect Lifecycle
  console.log('\n7. Gateway Disconnect & Status Update');
  gwWs.close();
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert(!cctvSignalingService.isGatewayOnline(gymA), 'Gateway marked OFFLINE immediately upon socket termination');

  viewerWs.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n============================================================');
  console.log(`🎉 ALL GATE 5 TESTS COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('============================================================\n');
  process.exit(0);
}

runGate5Tests().catch((err) => {
  console.error('\n❌ Gate 5 Verification Suite Failed:\n', err);
  process.exit(1);
});
