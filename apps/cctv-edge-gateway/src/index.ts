/**
 * GymDeck CCTV Edge Gateway - Process Lifecycle & Main Daemon Supervisor
 */

import { secureStore } from './config/secureStore';
import { gatewayIdentity } from './identity/gatewayIdentity';
import { enrollmentClient } from './enrollment/enrollmentClient';
import { heartbeatAgent } from './telemetry/heartbeatAgent';
import { localApiServer, GATEWAY_LOOPBACK_PORT } from './server/localApi';

export async function bootstrapGateway(): Promise<void> {
  const args = process.argv.slice(2);
  const fingerprint = gatewayIdentity.getFingerprint();

  console.log('====================================================');
  console.log('🎥 GymDeck CCTV Edge Gateway Daemon');
  console.log(`   Host: ${fingerprint.hostname} (${fingerprint.platform} ${fingerprint.arch})`);
  console.log(`   Local LAN IP: ${fingerprint.localIp}`);
  console.log(`   Machine ID: ${fingerprint.machineId.substring(0, 12)}...`);
  console.log('====================================================');

  // Check for command line enrollment: --enroll <token> [--cloud <url>]
  const enrollIndex = args.indexOf('--enroll');
  if (enrollIndex !== -1 && args[enrollIndex + 1]) {
    const token = args[enrollIndex + 1];
    const cloudIndex = args.indexOf('--cloud');
    const cloudUrl = cloudIndex !== -1 && args[cloudIndex + 1] ? args[cloudIndex + 1] : 'http://127.0.0.1:3001';

    console.log(`[Enrollment] Attempting enrollment with token: ${token.substring(0, 16)}...`);
    const result = await enrollmentClient.enroll(token, cloudUrl);

    if (result.success) {
      console.log(`✅ [Enrollment] Successfully enrolled! Gateway ID: ${result.gatewayId}, Gym ID: ${result.gymId}`);
    } else {
      console.error(`❌ [Enrollment] Enrollment failed: ${result.error}`);
      process.exit(1);
    }
  }

  // Start local loopback IPC server
  try {
    await localApiServer.start(GATEWAY_LOOPBACK_PORT);
    console.log(`[IPC] Local control loopback active on http://127.0.0.1:${GATEWAY_LOOPBACK_PORT}`);
  } catch (err: any) {
    console.error(`[IPC] Failed to bind local loopback server: ${err.message}`);
  }

  // If already enrolled, start background heartbeat agent
  if (secureStore.isEnrolled()) {
    const config = secureStore.loadConfig();
    console.log(`[Gateway] Operating as enrolled gateway ${config?.gatewayId} for gym ${config?.gymId}`);
    heartbeatAgent.start(30000);
    console.log('[Telemetry] Cloud heartbeat agent active (30s interval)');
  } else {
    console.log('⚠️ [Gateway] Gateway not yet enrolled. Awaiting setup from GymDeck Desktop or --enroll command.');
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Lifecycle] Received ${signal}. Commencing graceful gateway shutdown...`);
    heartbeatAgent.stop();
    await localApiServer.stop();
    console.log('[Lifecycle] Gateway terminated cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrapGateway().catch((err) => {
  console.error('[Fatal] Uncaught gateway exception:', err);
  process.exit(1);
});
