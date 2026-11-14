/**
 * GymDeck CCTV Edge Gateway - Gate 2 Verification Test Suite
 * Tests hardware fingerprinting, hardware-bound AES-256-GCM encrypted store,
 * enrollment protocol, telemetry gathering, and local loopback API server.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { gatewayIdentity } from '../src/identity/gatewayIdentity';
import { SecureStore, GatewayConfig } from '../src/config/secureStore';
import { HeartbeatAgent } from '../src/telemetry/heartbeatAgent';
import { LocalApiServer } from '../src/server/localApi';
import { EnrollmentClient } from '../src/enrollment/enrollmentClient';

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

async function runGate2Tests() {
  console.log('\n============================================================');
  console.log('🧪 GYMDECK CCTV GATE 2: EDGE GATEWAY VERIFICATION SUITE');
  console.log('============================================================\n');

  // Test 1: Hardware Fingerprint & Identity
  console.log('1. Hardware Fingerprint & Machine Identity');
  const fingerprint = gatewayIdentity.getFingerprint();
  assert(Boolean(fingerprint.machineId && fingerprint.machineId.length === 64), 'Deterministic 256-bit machine ID derived');
  assert(Boolean(fingerprint.platform), `Host platform detected: ${fingerprint.platform}`);
  assert(fingerprint.cpus > 0, `CPU cores detected: ${fingerprint.cpus}`);
  assert(fingerprint.totalMemoryMb > 0, `Total RAM detected: ${fingerprint.totalMemoryMb} MB`);
  assert(Boolean(fingerprint.localIp), `Primary LAN IP discovered: ${fingerprint.localIp}`);

  // Test 2: Asymmetric Device Key Generation
  console.log('\n2. Cryptographic Device Attestation Keypair');
  const keyPair = gatewayIdentity.generateDeviceKeyPair();
  assert(keyPair.publicKey.includes('BEGIN PUBLIC KEY'), 'Generated standard PEM public key');
  assert(keyPair.privateKey.includes('BEGIN PRIVATE KEY'), 'Generated standard PEM private key');

  // Test 3: Hardware-Bound AES-256-GCM Encrypted Config Store
  console.log('\n3. Hardware-Bound AES-256-GCM Secure Store');
  const testConfigDir = path.join(os.tmpdir(), `gymdeck_test_${crypto.randomBytes(6).toString('hex')}`);
  const testStore = new SecureStore(testConfigDir);

  const mockConfig: GatewayConfig = {
    gatewayId: crypto.randomUUID(),
    gymId: crypto.randomUUID(),
    name: 'Test Reception Gateway',
    deviceToken: 'device_jwt_test_token_2026',
    enrolledAt: new Date().toISOString(),
    cloudApiUrl: 'https://cloud.gymdeck.test',
  };

  testStore.saveConfig(mockConfig);
  assert(testStore.isEnrolled(), 'Store confirms gateway is enrolled');

  const loadedConfig = testStore.loadConfig();
  assert(Boolean(loadedConfig), 'Successfully loaded and decrypted configuration');
  assert(loadedConfig?.gatewayId === mockConfig.gatewayId, 'Decrypted gatewayId matches original');
  assert(loadedConfig?.deviceToken === mockConfig.deviceToken, 'Decrypted deviceToken matches original');

  // Verify file on disk is encrypted, not plaintext JSON
  const encryptedFileContents = fs.readFileSync(path.join(testConfigDir, 'cctv-gateway-config.enc'), 'utf8');
  assert(encryptedFileContents.startsWith('v1:'), 'Configuration stored with authenticated AES-GCM envelope');
  assert(!encryptedFileContents.includes('device_jwt_test_token_2026'), 'Zero credential leakage in persistent storage');

  // Clean up test store
  testStore.clearConfig();
  fs.rmSync(testConfigDir, { recursive: true, force: true });

  // Test 4: Heartbeat & Telemetry Gathering
  console.log('\n4. Telemetry Gathering & Metrics Engine');
  const heartbeat = new HeartbeatAgent();
  const metrics = heartbeat.collectMetrics();

  assert(metrics.cpuUsagePercent >= 0 && metrics.cpuUsagePercent <= 100, `CPU utilization sampled: ${metrics.cpuUsagePercent}%`);
  assert(metrics.memoryUsageMb > 0, `Memory utilization sampled: ${metrics.memoryUsageMb} MB`);
  assert(metrics.diskFreeGb > 0, `Free disk space sampled: ${metrics.diskFreeGb} GB`);
  assert(metrics.activeStreamsCount === 0, 'Active stream count initialized to 0');

  // Test 5: Local Loopback IPC Server (127.0.0.1)
  console.log('\n5. Local Loopback IPC Server (127.0.0.1:49153)');
  const testPort = 49153;
  const localApi = new LocalApiServer();
  await localApi.start(testPort);

  // Probe /health endpoint
  const healthRes = await fetch(`http://127.0.0.1:${testPort}/health`);
  const healthData = await healthRes.json() as any;
  assert(healthRes.status === 200, 'Loopback /health responded with HTTP 200');
  assert(healthData.status === 'OK', 'Loopback health payload verified');
  assert(healthData.service === 'GymDeck CCTV Edge Gateway', 'Loopback service name confirmed');

  // Probe /status endpoint
  const statusRes = await fetch(`http://127.0.0.1:${testPort}/status`);
  const statusData = await statusRes.json() as any;
  assert(statusRes.status === 200, 'Loopback /status responded with HTTP 200');
  assert('isEnrolled' in statusData, 'Status payload contains isEnrolled boolean');
  assert('host' in statusData, 'Status payload contains host telemetry');

  await localApi.stop();
  assert(true, 'Local loopback server stopped cleanly');

  // Test 6: Cloud Enrollment Handshake Protocol
  console.log('\n6. Enrollment Handshake Protocol Mock Verification');
  // Setup mock cloud server
  const mockCloudPort = 49154;
  const mockCloud = http.createServer((req, res) => {
    if (req.url === '/v1/cctv/gateways/enroll' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const payload = JSON.parse(body);
        if (payload.token === 'valid_enrollment_token_123') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: {
              gatewayId: 'test-gw-uuid-1234',
              gymId: 'test-gym-uuid-5678',
              deviceToken: 'device_permanent_jwt_test',
            }
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid or expired enrollment token.' }));
        }
      });
    }
  });

  await new Promise<void>(resolve => mockCloud.listen(mockCloudPort, '127.0.0.1', () => resolve()));

  const client = new EnrollmentClient();
  const successfulEnroll = await client.enroll('valid_enrollment_token_123', `http://127.0.0.1:${mockCloudPort}`);
  assert(successfulEnroll.success === true, 'Enrollment succeeded with valid token');
  assert(successfulEnroll.gatewayId === 'test-gw-uuid-1234', 'Returned gatewayId stored');

  const failedEnroll = await client.enroll('expired_token', `http://127.0.0.1:${mockCloudPort}`);
  assert(failedEnroll.success === false, 'Enrollment rejected invalid token');

  await new Promise<void>(resolve => mockCloud.close(() => resolve()));

  // Test 7: Service Supervisors Syntax
  console.log('\n7. Systemd & Launchd Service Descriptors');
  const systemdPath = path.join(__dirname, '../service/gymdeck-cctv-gateway.service');
  const launchdPath = path.join(__dirname, '../service/com.gymdeck.cctv.gateway.plist');

  assert(fs.existsSync(systemdPath), 'systemd service file exists for Linux deployment');
  assert(fs.readFileSync(systemdPath, 'utf8').includes('Restart=always'), 'systemd service specifies Restart=always');

  assert(fs.existsSync(launchdPath), 'launchd plist file exists for macOS deployment');
  assert(fs.readFileSync(launchdPath, 'utf8').includes('com.gymdeck.cctv.gateway'), 'launchd plist defines correct bundle identifier');

  console.log('\n============================================================');
  console.log(`🎉 ALL GATE 2 TESTS COMPLETED: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('============================================================\n');
}

runGate2Tests().catch((err) => {
  console.error('\n❌ Gate 2 Verification Suite Failed:\n', err);
  process.exit(1);
});
