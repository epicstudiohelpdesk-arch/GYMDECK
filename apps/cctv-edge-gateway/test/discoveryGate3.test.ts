/**
 * GymDeck CCTV Subsystem - Gate 3 Verification Test Suite
 * Tests ONVIF WS-Discovery probe, SOAP UsernameToken security digests,
 * multi-brand adapters (Hikvision, Dahua, CP Plus, ONVIF), and AutoConfig engine.
 */

import * as crypto from 'crypto';
import { WsDiscoveryEngine } from '../src/discovery/wsDiscovery';
import { OnvifClient } from '../src/onvif/onvifClient';
import { AdapterFactory } from '../src/adapters/adapterFactory';
import { AutoConfigEngine } from '../src/engine/autoConfigEngine';
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

async function runGate3Tests() {
  console.log('\n============================================================');
  console.log('🧪 GYMDECK CCTV GATE 3: ONVIF DISCOVERY & DEVICE REGISTRATION');
  console.log('============================================================\n');

  // Test 1: WS-Discovery Probe Message Generation
  console.log('1. WS-Discovery Probe Message Construction');
  const probeXml = WsDiscoveryEngine.buildProbeMessage();
  assert(probeXml.includes('http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe'), 'Includes WS-Discovery Probe action header');
  assert(probeXml.includes('dn:NetworkVideoTransmitter'), 'Targets ONVIF NetworkVideoTransmitter type');
  assert(probeXml.includes('239.255.255.250') || probeXml.includes('schemas-xmlsoap-org:ws:2005:04:discovery'), 'Valid addressing destination');

  // Test 2: ProbeMatches XML Parsing & Brand Detection
  console.log('\n2. ProbeMatches Parsing & Vendor Brand Detection');
  const mockHikvisionProbeMatch = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope"
                   xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
                   xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
  <SOAP-ENV:Body>
    <d:ProbeMatches>
      <d:ProbeMatch>
        <wsa:EndpointReference>
          <wsa:Address>urn:uuid:12345678-abcd-ef01-2345-6789abcdef01</wsa:Address>
        </wsa:EndpointReference>
        <d:Types>dn:NetworkVideoTransmitter</d:Types>
        <d:Scopes>
          onvif://www.onvif.org/type/NetworkVideoTransmitter
          onvif://www.onvif.org/name/HIKVISION%20DS-7608NI
          onvif://www.onvif.org/hardware/DS-7608NI-I2/8P
          onvif://www.onvif.org/location/MainGym
        </d:Scopes>
        <d:XAddrs>http://192.168.1.120:80/onvif/device_service</d:XAddrs>
      </d:ProbeMatch>
    </d:ProbeMatches>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  const hikDevice = WsDiscoveryEngine.parseProbeMatch(mockHikvisionProbeMatch, '192.168.1.120');
  assert(Boolean(hikDevice), 'Successfully parsed Hikvision ProbeMatches envelope');
  assert(hikDevice?.brand === 'HIKVISION', 'Accurately detected brand as HIKVISION');
  assert(hikDevice?.hardware === 'DS-7608NI-I2/8P', 'Extracted hardware model DS-7608NI-I2/8P');
  assert(hikDevice?.xaddrs[0] === 'http://192.168.1.120:80/onvif/device_service', 'Extracted device service XAddr');

  // Test 3: Dahua / CP Plus Discovery Parsing
  console.log('\n3. Dahua & CP Plus Discovery Parsing');
  const mockCpPlusMatch = `
    <d:ProbeMatches xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      <d:ProbeMatch>
        <wsa:Address>urn:uuid:99887766-1122-3344-5566-77889900aabb</wsa:Address>
        <d:Scopes>onvif://www.onvif.org/name/CPPlus%20Orange onvif://www.onvif.org/hardware/CP-UVR-0801E1</d:Scopes>
        <d:XAddrs>http://192.168.1.130:80/onvif/device_service</d:XAddrs>
      </d:ProbeMatch>
    </d:ProbeMatches>
  `;
  const cpDevice = WsDiscoveryEngine.parseProbeMatch(mockCpPlusMatch, '192.168.1.130');
  assert(cpDevice?.brand === 'CP_PLUS', 'Accurately detected brand as CP_PLUS');
  assert(cpDevice?.hardware === 'CP-UVR-0801E1', 'Extracted model CP-UVR-0801E1');

  // Test 4: ONVIF WS-Security Password Digest Header
  console.log('\n4. ONVIF WS-Security UsernameToken Digest');
  const user = 'admin';
  const pass = 'GymAdmin@2026';
  const secHeader = OnvifClient.buildSecurityHeader(user, pass);

  assert(secHeader.includes('<wsse:Username>admin</wsse:Username>'), 'Header includes username');
  assert(secHeader.includes('#PasswordDigest'), 'Header specifies PasswordDigest type');
  assert(secHeader.includes('<wsse:Nonce'), 'Header includes cryptographic nonce');
  assert(secHeader.includes('<wsu:Created>'), 'Header includes ISO 8601 creation timestamp');
  assert(!secHeader.includes(pass), 'Plaintext password is never exposed in the SOAP header');

  // Test 5: Vendor Adapter Factory Selection
  console.log('\n5. Adapter Factory Selection');
  const hikAdapter = AdapterFactory.getAdapter('192.168.1.120', 'HIKVISION');
  assert(hikAdapter.brand === 'HIKVISION', 'Factory selected HikvisionAdapter for HIKVISION');

  const cpAdapter = AdapterFactory.getAdapter('192.168.1.130', 'CP_PLUS');
  assert(cpAdapter.brand === 'CP_PLUS', 'Factory selected DahuaAdapter for CP_PLUS');

  const onvifAdapter = AdapterFactory.getAdapter('192.168.1.140', 'GENERIC_ONVIF');
  assert(onvifAdapter.brand === 'GENERIC_ONVIF', 'Factory selected OnvifAdapter for GENERIC_ONVIF');

  // Test 6: Hikvision Multi-Channel Matrix
  console.log('\n6. Hikvision Channel Matrix Discovery');
  const hikChannels = await hikAdapter.discoverChannels({ username: 'admin', password: 'password' });
  assert(hikChannels.length === 8, 'Hikvision adapter discovered 8 channels');
  assert(hikChannels[0].mainRtspUrl?.includes('/Streaming/Channels/101'), 'Channel 1 main stream mapped to 101');
  assert(hikChannels[0].subRtspUrl?.includes('/Streaming/Channels/102'), 'Channel 1 substream mapped to 102');
  assert(hikChannels[0].capabilities.supportsSubstream === true, 'Substream capability flagged as supported');

  // Test 7: Dahua / CP Plus Realmonitor RTSP Mapping
  console.log('\n7. Dahua & CP Plus Realmonitor RTSP Mapping');
  const cpChannels = await cpAdapter.discoverChannels({ username: 'admin', password: 'password' });
  assert(cpChannels.length === 8, 'CP Plus adapter discovered 8 channels');
  assert(cpChannels[0].mainRtspUrl?.includes('subtype=0'), 'Channel 1 main stream mapped to subtype=0');
  assert(cpChannels[0].subRtspUrl?.includes('subtype=1'), 'Channel 1 substream mapped to subtype=1');

  // Test 8: Automatic Configuration Engine
  console.log('\n8. Automatic Configuration Engine');
  const configProfile = AutoConfigEngine.configure(
    {
      brand: 'HIKVISION',
      model: 'DS-7608NI-I2/8P',
      serialNumber: 'DS123456789',
      firmwareVersion: 'V4.50.000',
      totalChannels: 8,
      supportsOnvifT: true,
      supportsOnvifG: true,
      supportsPtz: false,
    },
    hikChannels
  );

  assert(configProfile.deviceType === 'NVR', 'Config engine classified multi-channel device as NVR');
  assert(configProfile.defaults.gridStreamProfile === 'SUB', 'Default grid stream profile is SUB');
  assert(configProfile.defaults.fullscreenStreamProfile === 'MAIN', 'Default fullscreen stream profile is MAIN');
  assert(configProfile.channels[0].name === 'Reception & Entrance', 'Channel 1 assigned friendly default name');
  assert(configProfile.channels[1].name === 'Main Workout Floor', 'Channel 2 assigned friendly default name');
  assert(configProfile.channels[2].name === 'Free Weights Area', 'Channel 3 assigned friendly default name');
  assert(configProfile.channels[3].name === 'Cardio Deck', 'Channel 4 assigned friendly default name');

  // Test 9: Local Loopback API Discovery Route Validation
  console.log('\n9. Local Loopback API Discovery Endpoints');
  const testPort = 49156;
  const localApi = new LocalApiServer();
  await localApi.start(testPort);

  // Test /discovery/probe
  const probeRes = await fetch(`http://127.0.0.1:${testPort}/discovery/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeoutMs: 500 }),
  });
  const probeData = await probeRes.json() as any;
  assert(probeRes.status === 200, 'POST /discovery/probe responded with HTTP 200');
  assert('devices' in probeData, 'Discovery response contains devices array');

  // Test /discovery/inspect parameter validation
  const inspectRes = await fetch(`http://127.0.0.1:${testPort}/discovery/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ipAddress: '192.168.1.120' }), // Missing username & password
  });
  assert(inspectRes.status === 400, 'POST /discovery/inspect rejected missing credentials with HTTP 400');

  await localApi.stop();

  console.log('\n============================================================');
  console.log(`🎉 ALL GATE 3 TESTS COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('============================================================\n');
}

runGate3Tests().catch((err) => {
  console.error('\n❌ Gate 3 Verification Suite Failed:\n', err);
  process.exit(1);
});
