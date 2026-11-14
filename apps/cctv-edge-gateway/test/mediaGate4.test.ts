/**
 * GymDeck CCTV Subsystem - Gate 4 Verification Test Suite
 * Tests RTSP ingestion management, MediaMTX configuration, WHEP WebRTC playout,
 * concurrent stream capping, and idle stream cleanup.
 */

import * as crypto from 'crypto';
import { MediaEngine, CameraStreamRoute } from '../src/media/mediaEngine';
import { StreamManager } from '../src/media/streamManager';
import { WhepGateway } from '../src/media/whepGateway';
import { LocalApiServer } from '../src/server/localApi';

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

async function runGate4Tests() {
  console.log('\n============================================================');
  console.log('🧪 GYMDECK CCTV GATE 4: RTSP INGESTION & LOCAL WEBRTC PLAYOUT');
  console.log('============================================================\n');

  // Test 1: MediaMTX Declarative Configuration Generation
  console.log('1. Media Engine Declarative Configuration');
  const mockRoutes: CameraStreamRoute[] = [
    {
      streamId: 'cam1_sub',
      cameraId: 'cam-uuid-1',
      channelNumber: 1,
      profile: 'SUB',
      rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/102',
    },
    {
      streamId: 'cam1_main',
      cameraId: 'cam-uuid-1',
      channelNumber: 1,
      profile: 'MAIN',
      rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/101',
    },
  ];

  const configYaml = MediaEngine.generateConfig(mockRoutes, 8889, 8554);
  assert(configYaml.includes('rtspTransports: [tcp]'), 'Enforces TCP transport for RTSP packets');
  assert(configYaml.includes('webrtc: yes'), 'Enables WebRTC engine');
  assert(configYaml.includes('webrtcAddress: :8889'), 'Binds WebRTC WHEP to designated port');
  assert(configYaml.includes('sourceOnDemand: yes'), 'Configures on-demand RTSP ingestion');
  assert(configYaml.includes('cam1_sub:'), 'Configures substream route');
  assert(configYaml.includes('cam1_main:'), 'Configures main stream route');

  // Test 2: Stream Manager Lifecycle & Concurrent Stream Caps
  console.log('\n2. Stream Manager Ingestion & Concurrency Protection');
  const maxStreams = 4;
  const manager = new StreamManager({ maxConcurrentStreams: maxStreams, idleTimeoutSeconds: 1 });

  const stream1 = manager.requestStream('cam-1', 1, 'SUB', 'rtsp://192.168.1.100:554/102');
  assert(stream1.id === 'cam-1_sub', 'Stream ID generated correctly for substream');
  assert(stream1.activeViewersCount === 1, 'Viewer count initialized to 1');
  assert(stream1.status === 'STREAMING', 'Stream status marked as STREAMING');

  // Requesting same stream increments viewer count
  const stream1Again = manager.requestStream('cam-1', 1, 'SUB', 'rtsp://192.168.1.100:554/102');
  assert(stream1Again.activeViewersCount === 2, 'Multiple viewers share single RTSP ingestion pipeline');

  // Request streams up to capacity
  manager.requestStream('cam-2', 2, 'SUB', 'rtsp://192.168.1.100:554/202');
  manager.requestStream('cam-3', 3, 'SUB', 'rtsp://192.168.1.100:554/302');
  manager.requestStream('cam-4', 4, 'SUB', 'rtsp://192.168.1.100:554/402');
  assert(manager.getAllActiveStreams().length === 4, 'Active stream count reached 4');

  // Requesting a 5th stream when all 4 have active viewers must throw capacity error
  let capacityErrorThrown = false;
  try {
    manager.requestStream('cam-5', 5, 'SUB', 'rtsp://192.168.1.100:554/502');
  } catch (err: any) {
    capacityErrorThrown = true;
    assert(err.message.includes('CCTV Stream Capacity Reached'), 'Enforced maximum concurrent stream limit');
  }
  assert(capacityErrorThrown, 'Concurrency protection prevented runaway resource consumption');

  // Release viewer
  manager.releaseStream('cam-1_sub');
  assert(manager.getStream('cam-1_sub')?.activeViewersCount === 1, 'Released viewer count decremented accurately');

  manager.stop();

  // Test 3: Standard WHEP SDP Offer / Answer Handshake
  console.log('\n3. Standard WHEP WebRTC Playout Negotiation');
  const mockClientSdpOffer = [
    'v=0',
    'o=- 1234567890 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'm=video 9 UDP/TLS/RTP/SAVPF 96',
    'c=IN IP4 0.0.0.0',
    'a=recvonly',
    'a=rtpmap:96 H264/90000',
    '',
  ].join('\r\n');

  const whep = new WhepGateway();
  const offerResult = whep.handleOffer('cam-1_sub', mockClientSdpOffer, '127.0.0.1', '192.168.1.50');

  assert(Boolean(offerResult.sessionId), 'WHEP session ID created');
  assert(offerResult.locationHeader.includes('/whep/cam-1_sub/sessions/'), 'Location header generated per WHEP spec');
  assert(offerResult.sdpAnswer.includes('m=video'), 'SDP Answer includes video media line');
  assert(offerResult.sdpAnswer.includes('a=sendonly'), 'SDP Answer confirms sendonly media direction');
  assert(offerResult.sdpAnswer.includes('a=rtpmap:96 H264/90000'), 'SDP Answer confirms H.264 video codec');
  assert(offerResult.sdpAnswer.includes('a=fingerprint:sha-256'), 'SDP Answer includes DTLS fingerprint');

  // Close WHEP session
  const closed = whep.closeSession(offerResult.sessionId);
  assert(closed === true, 'WHEP session terminated and cleaned up');
  assert(whep.getActiveSessionsCount() === 0, 'Active sessions count updated to 0');

  // Test 4: Local HTTP Loopback WHEP Playout API
  console.log('\n4. Local HTTP Loopback WHEP Endpoint Integration');
  const testPort = 49158;
  const localApi = new LocalApiServer();
  await localApi.start(testPort);

  // Request stream creation via API
  const reqStreamRes = await fetch(`http://127.0.0.1:${testPort}/streams/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cameraId: 'cam-reception',
      channelNumber: 1,
      profile: 'SUB',
      rtspUrl: 'rtsp://192.168.1.120:554/Streaming/Channels/102',
    }),
  });
  const reqStreamData = await reqStreamRes.json() as any;
  assert(reqStreamRes.status === 200, 'POST /streams/request responded with HTTP 200');
  assert(reqStreamData.stream.id === 'cam-reception_sub', 'Stream ID created for reception camera');

  // Send WHEP SDP Offer to play video
  const whepRes = await fetch(`http://127.0.0.1:${testPort}/whep/cam-reception_sub`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: mockClientSdpOffer,
  });

  assert(whepRes.status === 201, 'POST /whep/:streamId responded with HTTP 201 Created');
  assert(whepRes.headers.get('content-type') === 'application/sdp', 'Content-Type is application/sdp');
  const location = whepRes.headers.get('location');
  assert(Boolean(location && location.includes('/sessions/')), 'WHEP Location header returned');

  const sdpAnswerBody = await whepRes.text();
  assert(sdpAnswerBody.includes('a=sendonly'), 'Returned valid SDP Answer to client');

  // Terminate WHEP session via DELETE
  const deleteRes = await fetch(`http://127.0.0.1:${testPort}${location}`, {
    method: 'DELETE',
  });
  assert(deleteRes.status === 200, 'DELETE /whep/.../sessions/:id closed WHEP session cleanly');

  await localApi.stop();

  console.log('\n============================================================');
  console.log(`🎉 ALL GATE 4 TESTS COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('============================================================\n');
  process.exit(0);
}

runGate4Tests().catch((err) => {
  console.error('\n❌ Gate 4 Verification Suite Failed:\n', err);
  process.exit(1);
});
