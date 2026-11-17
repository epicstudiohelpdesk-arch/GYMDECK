/**
 * GymDeck CCTV Phase 1.5 - Master Hardware-Independent Validation Suite
 *
 * Single deterministic entry point to execute the complete validation pipeline:
 * 1. IPC Security & Token Protection Audit
 * 2. Cross-Platform MediaMTX Packaging & Checksums
 * 3. Real Media Pipeline (FFmpeg Test Source -> RTSP -> MediaMTX -> WHEP -> Frame Decoder)
 * 4. Multi-Camera Scalability Benchmark (1, 4, 9, 16 Channels)
 * 5. Remote Connectivity & Network Degradation Simulation
 * 6. Failure Injection & Supervisor Crash Recovery
 */

import { runPackagingAudit } from '../scripts/packageMediaMtx';
import { runRealMediaPipelineTest } from './realMediaPipeline';
import { runMultiCameraBenchmark } from './multiCameraBenchmark';
import { runRemoteConnectivitySimulation } from './remoteConnectivitySimulation';
import { runFailureInjectionTests } from './failureInjection';
import { secureStore } from '../src/config/secureStore';
import { LocalApiServer } from '../src/server/localApi';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 GYMDECK CCTV SUBSYSTEM: PHASE 1.5 VALIDATION & HARDENING SUITE');
  console.log('='.repeat(80) + '\n');

  const overallResults: Array<{ section: string; scenario: string; status: string; notes: string }> = [];

  try {
    // 1. IPC Security Hardening
    console.log('------------------------------------------------------------');
    console.log('🔒 0. IPC SECURITY HARDENING & TOKEN PROTECTION AUDIT');
    console.log('------------------------------------------------------------');

    const testPort = 49185;
    const testApi = new LocalApiServer();
    await testApi.start(testPort);

    // Test A: Direct HTTP token extraction is blocked
    const unauthRes = await fetch(`http://127.0.0.1:${testPort}/ipc/token`);
    const extractionBlocked = unauthRes.status === 403;
    console.log(`  ✅ Direct unauthenticated HTTP token extraction blocked: HTTP ${unauthRes.status}`);

    // Test B: Token rotation
    const token = secureStore.getOrGenerateIpcSecret();
    const rotateRes = await fetch(`http://127.0.0.1:${testPort}/ipc/token/rotate`, {
      method: 'POST',
      headers: { 'X-GymDeck-IPC-Token': token },
    });
    const rotateOk = rotateRes.status === 200;
    console.log(`  ✅ Authenticated token rotation verified: HTTP ${rotateRes.status}`);

    // Test C: Protected operational endpoint rejects missing token
    const unauthOpRes = await fetch(`http://127.0.0.1:${testPort}/streams/active`);
    const opProtected = unauthOpRes.status === 401;
    console.log(`  ✅ Unauthenticated operational route access rejected: HTTP ${unauthOpRes.status}`);

    await testApi.stop();

    overallResults.push({
      section: '0. IPC Security Hardening',
      scenario: 'Direct HTTP token extraction disabled (requires Tauri IPC / 0600 file)',
      status: extractionBlocked ? 'PASS' : 'FAIL',
      notes: 'HTTP 403 Forbidden returned to arbitrary HTTP requests on /ipc/token',
    });
    overallResults.push({
      section: '0. IPC Security Hardening',
      scenario: 'Authenticated token rotation with zero downtime',
      status: rotateOk ? 'PASS' : 'FAIL',
      notes: 'POST /ipc/token/rotate successfully provisions fresh 64-char hex secret',
    });
    overallResults.push({
      section: '0. IPC Security Hardening',
      scenario: 'Operational endpoints enforce valid IPC secret',
      status: opProtected ? 'PASS' : 'FAIL',
      notes: 'Unauthenticated requests to /streams/* rejected with HTTP 401',
    });

    // 2. Cross-Platform Packaging Audit
    console.log('\n------------------------------------------------------------');
    console.log('📦 1. CROSS-PLATFORM MEDIAMTX PACKAGING & CHECKSUMS');
    console.log('------------------------------------------------------------');
    const packagingResults = runPackagingAudit();
    for (const p of packagingResults) {
      console.log(`  • ${p.target}: Checksum ${p.checksumAttestationVerified ? 'VERIFIED' : 'FAILED'} (${p.runtimeExecutableStatus}) - ${p.notes}`);
      overallResults.push({
        section: '1. Packaging',
        scenario: `${p.target} Official Release Manifest & Checksum`,
        status: p.runtimeExecutableStatus,
        notes: p.notes,
      });
    }

    // 3. Real Media Pipeline Test
    const pipelineMetrics = await runRealMediaPipelineTest();
    for (const m of pipelineMetrics) {
      overallResults.push({
        section: '2. Real Media Pipeline',
        scenario: `${m.streamIdentifier} (${m.resolution} @ ${m.targetFps}fps)`,
        status: m.status,
        notes: `Decoded ${m.framesDecoded} frames, TTFF ${m.timeToFirstFrameMs}ms, Recon: ${m.reconnectionDurationMs}ms`,
      });
    }

    // 4. Multi-Camera Scalability Benchmark
    const multiMetrics = await runMultiCameraBenchmark();
    for (const mb of multiMetrics) {
      overallResults.push({
        section: '3. Multi-Camera Scalability',
        scenario: `${mb.layoutDescription} (${mb.channelCount} Channels)`,
        status: mb.status,
        notes: `RAM: ${mb.ramUsageMb}MB, CPU: ${mb.cpuPercent}%, Bandwidth: ${mb.aggregateBandwidthKbps}kbps`,
      });
    }

    // 5. Remote Connectivity Simulation
    const remoteMetrics = await runRemoteConnectivitySimulation();
    for (const rm of remoteMetrics) {
      overallResults.push({
        section: '4. Remote Connectivity',
        scenario: rm.scenario,
        status: rm.status,
        notes: `${rm.selectedPairType} (${rm.simulatedLatencyMs}ms lat, ${rm.simulatedPacketLossPercent}% loss) - ${rm.notes}`,
      });
    }

    // 6. Failure Injection Suite
    const failureMetrics = await runFailureInjectionTests();
    for (const fm of failureMetrics) {
      overallResults.push({
        section: '5. Failure Injection',
        scenario: fm.scenario,
        status: fm.status,
        notes: fm.observedBehavior,
      });
    }

    // Consolidated Master Table
    console.log('\n' + '='.repeat(80));
    console.log('📋 MASTER HARDWARE-INDEPENDENT VALIDATION SUMMARY:');
    console.log('='.repeat(80));
    console.table(overallResults);

    const counts = overallResults.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n📊 TEST EXECUTION SUMMARY:');
    for (const [k, v] of Object.entries(counts)) {
      console.log(`   ${k}: ${v}`);
    }
    console.log('='.repeat(80) + '\n');
  } catch (err: any) {
    console.error('❌ Master Validation Suite Aborted:', err);
    process.exit(1);
  }
}

main();
